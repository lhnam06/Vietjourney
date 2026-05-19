package main

import "time"

type ChangePayload struct {
	Action string      `json:"action"` // e.g., "ADD", "MOVE", "DELETE"
	Data   interface{} `json:"data"`   // The actual diff data
}

type Proposal struct {
	ID          string        `json:"proposal_id"`
	AuthorID    string        `json:"author_id"`
	BaseVersion int           `json:"base_version"`
	Payload     ChangePayload `json:"payload"`
	Status      string        `json:"status"` // "PENDING", "ACCEPTED", "REJECTED", "OUTDATED"
	CreatedAt   time.Time     `json:"created_at"`
}

type ProposalMessage struct {
	Type        string                 `json:"type"`
	Token       string                 `json:"token"`
	TimelineID  string                 `json:"timeline_id"`
	BaseVersion int                    `json:"base_version"`
	Payload     map[string]interface{} `json:"payload"`
}
