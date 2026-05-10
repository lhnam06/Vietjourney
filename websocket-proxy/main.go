package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	jwtSecret   []byte
	upgrader    = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for development
		},
	}
)

func init() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisClient = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	secret := os.Getenv("JWT_SIGNER_KEY")
	if secret == "" {
		// Fallback for dev if not provided in env.
		secret = "JbkeHOoV80MgJ5PuhqeC5sElK3DpLzNr7EExafczUD4oETLYQyEcg28TPug3MyyLy1Y34vDitUqvwjdZLiGZ1Z"
	}
	jwtSecret = []byte(secret)
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

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081" // Changed from 8080 to avoid backend conflict
	}

	http.HandleFunc("/ws/timeline/", handleWebSocket)

	log.Printf("Go WebSocket Proxy listening on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
