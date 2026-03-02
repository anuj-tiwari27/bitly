# Retail Link & QR Intelligence Platform

A full-stack platform for creating short, trackable links and generating customizable QR codes. Built with a microservices architecture using Python FastAPI for backend services and Next.js for the frontend.

## Features

- **Short Links**: Create branded, trackable short URLs with custom aliases
- **QR Code Generation**: Generate customizable QR codes with color options and logo overlays
- **Campaign Management**: Organize links into marketing campaigns
- **Real-time Analytics**: Track clicks, geographic distribution, device types, and referrers
- **Role-Based Access Control**: JWT authentication with Google OAuth support
- **High Performance**: Redis caching for fast redirects, Kafka for event streaming

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway (Traefik)                   │
│                    Routing / Rate Limiting / CORS                │
└─────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐           ┌───────────────┐
│  RBAC Service │         │  Link Service │           │   QR Service  │
│  (Auth/Users) │         │  (Short URLs) │           │  (QR Codes)   │
└───────────────┘         └───────────────┘           └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
                            ┌───────────────┐
                            │  PostgreSQL   │
                            │   (Primary)   │
                            └───────────────┘

┌───────────────┐         ┌───────────────┐           ┌───────────────┐
│   Redirect    │────────▶│    Event      │────────▶│   Analytics    │
│   Service     │         │   Collector   │  Kafka   │   Processor   │
└───────────────┘         └───────────────┘           └───────────────┘
        │                                                     │
        ▼                                                     ▼
┌───────────────┐                                     ┌───────────────┐
│     Redis     │                                     │  ClickHouse   │
│   (Cache)     │                                     │  (Analytics)  │
└───────────────┘                                     └───────────────┘
```

## Tech Stack

### Backend
- **Framework**: Python FastAPI
- **Databases**: PostgreSQL (primary), ClickHouse (analytics), Redis (cache)
- **Message Queue**: Apache Kafka
- **Object Storage**: AWS S3 (QR code images)
- **API Gateway**: Traefik

### Frontend
- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Charts**: Recharts
- **Authentication**: NextAuth.js

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- AWS S3 bucket (for QR code storage)

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd Bitly
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Configure the `.env` file with your settings:
```env
# Database
POSTGRES_USER=bitly
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=bitly

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ALGORITHM=HS256

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

### Running with Docker Compose

Start all services:
```bash
docker-compose up -d
```

This will start:
- Traefik (API Gateway) on port 80
- PostgreSQL on port 5432
- Redis on port 6379
- ClickHouse on port 8123
- Kafka on port 9092
- All backend microservices
- Frontend on port 3000

### Accessing the Application

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost
- **Traefik Dashboard**: http://localhost:8080

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/me` | Get current user |

### Links
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/links` | List user's links |
| POST | `/api/links` | Create new link |
| GET | `/api/links/{id}` | Get link details |
| PUT | `/api/links/{id}` | Update link |
| DELETE | `/api/links/{id}` | Delete link |
| GET | `/api/links/{id}/stats` | Get link analytics |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/{id}` | Get campaign details |
| PUT | `/api/campaigns/{id}` | Update campaign |
| DELETE | `/api/campaigns/{id}` | Delete campaign |

### QR Codes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/qr/links/{id}` | Generate QR for link |
| GET | `/api/qr/links/{id}` | Get link's QR codes |
| DELETE | `/api/qr/{id}` | Delete QR code |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Get analytics overview |
| GET | `/api/analytics/clicks` | Get clicks over time |
| GET | `/api/analytics/devices` | Get device breakdown |
| GET | `/api/analytics/referrers` | Get referrer breakdown |

## Development

### Local Backend Development

Each service can be run independently:

```bash
cd services/link-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Local Frontend Development

```bash
cd frontend/web
npm install
npm run dev
```

### Running Tests

```bash
# Install test dependencies
pip install -r tests/requirements.txt

# Run unit tests
pytest tests/ -v

# Run E2E tests (requires services running)
pytest tests/e2e/ -v --headed
```

## Project Structure

```
Bitly/
├── docker-compose.yml          # Docker orchestration
├── .env.example                # Environment template
├── infrastructure/
│   ├── traefik/               # API Gateway config
│   ├── postgres/              # PostgreSQL init scripts
│   └── clickhouse/            # ClickHouse schema
├── shared/
│   └── python/                # Shared Python library
│       ├── models/            # Pydantic schemas & ORM
│       ├── database.py        # DB utilities
│       ├── redis_client.py    # Redis client
│       ├── kafka_client.py    # Kafka client
│       └── auth.py            # Auth utilities
├── services/
│   ├── rbac-service/          # Authentication & RBAC
│   ├── link-service/          # Link management
│   ├── campaign-service/      # Campaign management
│   ├── qr-service/            # QR code generation
│   ├── redirect-service/      # URL redirection
│   ├── event-collector/       # Event ingestion
│   └── analytics-processor/   # Analytics processing
├── frontend/
│   └── web/                   # Next.js frontend
│       ├── app/               # App router pages
│       ├── components/        # React components
│       └── lib/               # Utilities & API client
└── tests/
    ├── test_*.py              # Unit tests
    └── e2e/                   # Playwright E2E tests
```

## Configuration

### Traefik Labels

Services are automatically discovered via Docker labels:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.service-name.rule=PathPrefix(`/api/path`)"
```

### Rate Limiting

Default rate limits:
- General API: 100 requests/second
- Redirect Service: 1000 requests/second

Configure in `infrastructure/traefik/traefik.yml`.

## Monitoring

### Health Checks

Each service exposes a `/health` endpoint:
```bash
curl http://localhost/api/links/health
```

### Traefik Dashboard

Access the Traefik dashboard at http://localhost:8080 to monitor:
- Service health
- Request metrics
- Routing rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
