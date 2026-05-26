package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var (
	redisClient    *redis.Client
	jwtSecret      []byte
	allowedOrigins []string
	upgrader       = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			if len(allowedOrigins) == 0 {
				return true // Allow all for development
			}
			origin := r.Header.Get("Origin")
			for _, allowed := range allowedOrigins {
				if allowed == "*" || origin == allowed {
					return true
				}
			}
			return false
		},
	}
)

func init() {
	redisUrl := os.Getenv("REDIS_URL")
	if redisUrl != "" {
		opt, err := redis.ParseURL(redisUrl)
		if err != nil {
			log.Fatalf("Invalid REDIS_URL: %v", err)
		}
		redisClient = redis.NewClient(opt)
	} else {
		redisAddr := os.Getenv("REDIS_ADDR")
		if redisAddr == "" {
			redisAddr = "localhost:6379"
		}
		redisClient = redis.NewClient(&redis.Options{
			Addr: redisAddr,
		})
	}

	secret := os.Getenv("JWT_SIGNER_KEY")
	if secret == "" {
		// Fallback for dev if not provided in env.
		secret = "REMOVED_JWT_SIGNER_KEY"
	}
	jwtSecret = []byte(secret)

	originsStr := os.Getenv("ALLOWED_ORIGINS")
	if originsStr != "" {
		allowedOrigins = strings.Split(originsStr, ",")
		for i := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
		}
	}
}

func verifyJWT(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Expected path: /ws/timeline/{timelineId}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) != 3 || pathParts[0] != "ws" || pathParts[1] != "timeline" {
		http.Error(w, "Invalid path structure. Expected /ws/timeline/:id", http.StatusBadRequest)
		return
	}
	timelineId := pathParts[2]

	// Extract JWT token from Query or Headers
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if tokenString == "" {
		http.Error(w, "Missing authentication token", http.StatusUnauthorized)
		return
	}

	token, err := verifyJWT(tokenString)
	if err != nil || !token.Valid {
		http.Error(w, "Invalid authentication token", http.StatusUnauthorized)
		return
	}

	// Upgrade the HTTP server connection to the WebSocket protocol
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	channelName := "timeline:" + timelineId
	pubsub := redisClient.Subscribe(ctx, channelName)
	defer pubsub.Close()

	// Handle broadcasts from Redis -> WebSocket Client
	go func() {
		ch := pubsub.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case msg := <-ch:
				err := conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
				if err != nil {
					log.Printf("Error writing back to websocket: %v", err)
					cancel()
					return
				}
			}
		}
	}()

	// Handle Transient events from WebSocket Client -> Redis
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Error reading from websocket: %v", err)
			}
			break
		}

		var msg ProposalMessage
		if err := json.Unmarshal(message, &msg); err == nil && msg.Type == "PROPOSAL_SUBMIT" {
			log.Printf("Received proposal from user for timeline %s", timelineId)
			go submitProposalToBackend(timelineId, msg)
			continue
		}

		// Simply validate if payload is JSON, then broadcast to Redis.
		// NO business logic verification.
		var payload map[string]interface{}
		if err := json.Unmarshal(message, &payload); err == nil {
			publishErr := redisClient.Publish(ctx, channelName, message).Err()
			if publishErr != nil {
				log.Printf("Failed to route message to Redis: %v", publishErr)
			}
		} else {
			log.Printf("Dropping non-JSON client message")
		}
	}
}

func submitProposalToBackend(timelineId string, msg ProposalMessage) {
	backendURL := os.Getenv("BACKEND_URL")
	if backendURL == "" {
		backendURL = "http://localhost:8082"
	}

	url := fmt.Sprintf("%s/api/v1/timelines/%s/proposals", backendURL, timelineId)
	
	// Flatten the frontend's nested structure to match backend's SubmitProposalRequest
	// Frontend sends { type: 'PROPOSAL_SUBMIT', payload: { action: 'ADD', data: {...} }, ... }
	changeType, _ := msg.Payload["action"].(string)
	actualPayload, _ := msg.Payload["data"].(map[string]interface{})

	backendReq := map[string]interface{}{
		"changeType":  changeType,
		"payload":     actualPayload,
		"baseVersion": msg.BaseVersion,
	}

	payloadBytes, _ := json.Marshal(backendReq)
	req, _ := http.NewRequest("POST", url, strings.NewReader(string(payloadBytes)))
	req.Header.Set("Content-Type", "application/json")
	if msg.Token != "" {
		req.Header.Set("Authorization", "Bearer " + msg.Token)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to forward proposal to backend: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		log.Printf("Backend returned error for proposal: %s", resp.Status)
	} else {
		log.Printf("Proposal successfully saved to backend for timeline %s", timelineId)
		
		// Broadcast the new proposal event to all connected clients via Redis
		broadcastMsg := map[string]interface{}{
			"type": "PROPOSAL_CREATED",
			"timestamp": time.Now().UnixMilli(),
			// Since we don't have the full backend response object here, 
			// we broadcast a generic event to trigger clients to fetch.
			// The frontend logic already handles 'PROPOSAL_CREATED' by calling fetchTimeline.
			"data": map[string]interface{}{
				"status": "PENDING",
				"changeType": changeType,
				"payload": actualPayload,
			},
		}
		broadcastBytes, _ := json.Marshal(broadcastMsg)
		channelName := "timeline:" + timelineId
		if err := redisClient.Publish(context.Background(), channelName, string(broadcastBytes)).Err(); err != nil {
			log.Printf("Failed to broadcast PROPOSAL_CREATED to Redis: %v", err)
		} else {
			log.Printf("Broadcasted PROPOSAL_CREATED to Redis channel %s", channelName)
		}
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081" 
	}

	http.HandleFunc("/ws/timeline/", handleWebSocket)

	log.Printf("Go WebSocket Proxy listening on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
