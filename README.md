# Smart Travel Planning App

A comprehensive, interactive travel planning application with smart discovery, real-time collaboration workspace, budget management, and user profiles.

## Features

### 🗺️ Smart Discovery
- Split-screen interface with interactive map and location cards
- Advanced filtering system (Weather, Vibe, Budget)
- Real-time search across locations
- Beautiful location cards with images, ratings, and tags
- Deep ocean blue (#0A4A6E) and vibrant orange (#FF6B35) color scheme

### 📅 Real-time Workspace
- Drag-and-drop timeline for daily itinerary planning
- Three-column layout: Timeline + Interactive Map + Live Chat
- Visual route planning with connected points on map
- Transportation time indicators between locations
- AI suggestion buttons for time gaps
- Real-time collaboration indicators (editing states, online users)
- Activity feed showing team member actions

### 💰 Budget Management
- Fintech-style dashboard design
- Budget vs. Actual spending with circular progress
- Debt settlement calculator showing who owes whom
- Transaction history linked to timeline activities
- Category breakdown with visualizations
- Split bill functionality
- Color-coded balance indicators (green/red)

### 👤 User Profile & Authentication
- Social login options (Google, Apple)
- Email/password authentication
- Travel preferences (pace, budget level, favorite categories)
- Past trips gallery with cover photos
- Customizable travel settings with sliders

## Tech Stack

- **React 18** with TypeScript
- **React Router 7** for navigation
- **React DnD** for drag-and-drop functionality
- **React Leaflet** for interactive maps
- **Motion** for smooth animations
- **Tailwind CSS v4** for styling
- **Radix UI** components for accessible UI elements
- **Lucide React** for icons

## Pages

- `/` - Discovery page with search, filters, and map
- `/workspace/:tripId` - Trip planning workspace
- `/budget/:tripId` - Budget management dashboard
- `/profile` - User profile and preferences
- `/auth` - Login and signup

## Mock Data

The app uses comprehensive mock data including:
- 8 sample locations in Paris
- 3 sample trips
- 4 sample users
- Transaction history
- Timeline items

## Future Enhancements

This app would greatly benefit from backend integration for:
- Real-time collaboration features
- Persistent trip storage
- User authentication and authorization
- Transaction history across devices
- Shared trip planning with team members
- Cloud-based photo storage for trips

Consider integrating with Supabase for:
- User authentication (social + email)
- Real-time database for collaborative editing
- File storage for trip photos
- Row-level security for private trips
- Real-time subscriptions for live updates
