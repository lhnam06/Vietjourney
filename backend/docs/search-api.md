# Search API (Frontend Integration Guide)

## Base Path
All search endpoints are under:

`/api/v1/search`

## Authentication
All endpoints require a Bearer token with role `USER`.

Header:

`Authorization: Bearer <jwt-token>`

## Endpoints

### 1) Lexical Search (Fuzzy Search)
`GET /api/v1/search/lexical`

Purpose:
- Search for tourist places (food, drink, activity) with Vietnamese slang/synonym expansion.
- Automatic typo tolerance (fuzzy matching) on names via PostgreSQL Trigram (`pg_trgm`) index.
- Optimized performance limiting query latency to millisecond levels.

Query Parameters:

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`q`** | String | **Yes** | - | Keyword to search (e.g. `cf`, `café`, `cà phêe`, `quan an`). Supports Vietnamese accents, lowercase/uppercase, and common slang/abbreviations. |
| **`category`** | String | No | - | Filter by category. Allowed values: `food`, `drink`, `activity`. |
| **`district`** | String | No | - | Filter by place district (e.g. `Quận 1`, `Quận 8`). |
| **`page`** | Integer | No | `0` | Page number (0-indexed). |
| **`size`** | Integer | No | `10` | Number of items per page. Maximum value is configured on backend (default: `30`). |

Response:

```json
{
  "code": 1000,
  "message": null,
  "result": {
    "data": [
      {
        "id": "5230",
        "name": "Coffee - Bánh Mì Đong Đầy",
        "address": "6 Cư Xá Bình Minh, Duong Ba Trac, Chánh Hưng, Hồ Chí Minh 700000, Việt Nam",
        "category": "drink",
        "district": "Quận 8",
        "images": [
          "https://res.cloudinary.com/drln6mtq9/image/upload/v177862257/SmartTravel/DRINK/Coffee_-_B%C3%B9%C3%A1nh_M%C3%AC_%C4%90ong_%C4%90%E1%BB%B9/main_image.jpg"
        ],
        "tags": {
          "vibe": ["outdoor"]
        },
        "rating": 4.5,
        "minPrice": 20000,
        "maxPrice": 50000,
        "latitude": 10.7432,
        "longitude": 106.6854
      }
    ],
    "total": 12,
    "page": 0,
    "size": 10,
    "totalPages": 2
  }
}
```

## Synonym Matching Logic
The search engine automatically expands input terms based on the local configuration `synonyms.json`:
- Inputting `cf` or `caphe` will automatically retrieve coffee shops with names containing `Cà phê`, `Cafe`, etc.
- Inputting misspelled words like `cà phêe` or `coffe` will still correctly yield results thanks to pg_trgm fuzzy matching.

## Error Notes
- If query parameter `q` is missing or empty, it returns an empty data list with total `0` rather than throwing an error.
- Providing an invalid category (anything other than `food`, `drink`, `activity`) returns app error code `4004` (Invalid Category).
- Invalid/missing token returns HTTP `401 Unauthorized`.
