# Document Automation System

Enterprise-grade document automation system with template management, dynamic generation, and workflow integration.

## Features

### 🚀 Core Capabilities
- **Template Management**: Visual editor with version control and collaborative editing
- **Dynamic Generation**: Data binding with conditional logic and iterative content
- **Multi-Format Output**: PDF, Word, HTML, Excel with formatting preservation
- **Workflow Integration**: Approval processes with digital signatures
- **Batch Processing**: Queue management with parallel execution
- **Document Assembly**: Merge, split, and watermark capabilities
- **Data Integration**: External data sources and real-time binding
- **Security**: JWT/RBAC integration with PARLANT validation

### 📊 Performance
- **High Throughput**: Optimized for enterprise-scale document generation
- **Real-time Processing**: Sub-10 second generation for complex documents
- **Scalable Architecture**: Horizontal scaling with load balancing
- **Resource Efficient**: Memory and CPU optimized processing

### 🔒 Enterprise Security
- **Authentication**: JWT-based authentication with role-based access control
- **Validation**: PARLANT conversational validation integration
- **Audit Trail**: Comprehensive logging and compliance tracking
- **Data Protection**: Document encryption and access controls

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm run build

# Start the service
pnpm run start
```

### Configuration

Set environment variables:

```bash
# Service Configuration
PORT=3004
NODE_ENV=production

# Database
DATABASE_URL=sqlite:./data/documents.db

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1h

# PARLANT Integration
PARLANT_ENDPOINT=http://localhost:3001
PARLANT_API_KEY=your-parlant-key

# File Storage
STORAGE_PATH=./storage/documents
MAX_FILE_SIZE=50MB
ALLOWED_FORMATS=pdf,docx,html,xlsx
```

### API Usage

```typescript
import { DocumentEngineService } from '@bytebot/document-automation';

// Generate a document
const result = await documentEngine.generateDocument({
  templateId: 'template_123',
  data: {
    title: 'Monthly Report',
    content: 'Report content here...',
    author: 'John Doe'
  },
  format: DocumentFormat.PDF,
  options: {
    watermark: {
      enabled: true,
      text: 'CONFIDENTIAL',
      opacity: 0.3
    }
  }
});
```

## API Documentation

### REST Endpoints

#### Document Generation
- `POST /document-generation/generate` - Generate document from template
- `GET /document-generation/status/:requestId` - Get generation status
- `DELETE /document-generation/cancel/:requestId` - Cancel generation
- `GET /document-generation/metrics` - Get processing metrics

#### Template Management
- `POST /templates` - Create new template
- `GET /templates` - List templates
- `GET /templates/:id` - Get template details
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template

#### Workflow Management
- `POST /workflows` - Create workflow
- `GET /workflows` - List workflows
- `POST /workflows/:id/execute` - Execute workflow
- `GET /workflows/:id/status` - Get workflow status

#### Batch Processing
- `POST /batch/generate` - Create batch job
- `GET /batch/:jobId/status` - Get batch status
- `DELETE /batch/:jobId/cancel` - Cancel batch job

#### Document Assembly
- `POST /assembly/merge` - Merge documents
- `POST /assembly/split` - Split document
- `POST /assembly/watermark` - Apply watermark
- `POST /assembly/protect` - Apply protection

### Interactive Documentation

Access the Swagger UI at: `http://localhost:3004/api/docs`

## Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Web Frontend  │    │  API Gateway    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │  Document Automation API   │
                    └─────────────┬───────────────┘
                                 │
        ┌────────────────────────────────────────────────┐
        │                                                │
        ▼                                                ▼
┌─────────────────┐                              ┌─────────────────┐
│ Template Engine │                              │ Processing Queue│
└─────────┬───────┘                              └─────────┬───────┘
          │                                                │
          ▼                                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Format Converter│    │ Workflow Engine │    │  Data Sources   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Package Structure

```
src/
├── core/                 # Core engine and orchestration
├── controllers/          # REST API controllers
├── services/            # Business logic services
├── types/               # TypeScript type definitions
├── dto/                 # Data transfer objects
├── entities/            # Database entities
├── guards/              # Authentication and authorization
├── middleware/          # Request/response middleware
└── utils/               # Utility functions
```

## Development

### Running Tests

```bash
# Unit tests
pnpm run test

# Integration tests
pnpm run test:integration

# Coverage report
pnpm run test:coverage

# Watch mode
pnpm run test:watch
```

### Code Quality

```bash
# Linting
pnpm run lint

# Type checking
pnpm run type-check

# Security scan
pnpm run security:scan
```

### Performance Testing

```bash
# Load testing
pnpm run test:load

# Memory profiling
pnpm run profile:memory

# Performance benchmarks
pnpm run benchmark
```

## Deployment

### Docker

```bash
# Build image
docker build -t document-automation .

# Run container
docker run -p 3004:3004 document-automation
```

### Docker Compose

```yaml
version: '3.8'
services:
  document-automation:
    build: .
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=sqlite:./data/documents.db
    volumes:
      - ./storage:/app/storage
      - ./data:/app/data
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security scanning completed
- [ ] Performance testing passed
- [ ] Documentation updated

## Monitoring

### Health Checks

- **Service Health**: `GET /health`
- **Database Health**: `GET /health/database`
- **Storage Health**: `GET /health/storage`
- **Dependencies**: `GET /health/dependencies`

### Metrics

- **Processing Metrics**: Document generation performance
- **Queue Metrics**: Batch processing statistics
- **Error Rates**: System reliability metrics
- **Resource Usage**: CPU, memory, storage utilization

### Logging

- **Structured Logging**: JSON formatted logs
- **Audit Trail**: Comprehensive activity logging
- **Error Tracking**: Detailed error reporting
- **Performance Logging**: Request/response timing

## Security

### Authentication

- **JWT Tokens**: Secure API access with expiration
- **Role-Based Access**: Granular permission control
- **API Rate Limiting**: Request throttling protection
- **CORS Policy**: Cross-origin request security

### Data Protection

- **Encryption**: Document content encryption at rest
- **Access Controls**: Fine-grained permission management
- **Audit Logging**: Complete activity tracking
- **Secure Storage**: Protected file system access

### Compliance

- **SOC 2**: Security framework compliance
- **GDPR**: Data privacy regulation adherence
- **HIPAA**: Healthcare data protection
- **ISO 27001**: Information security standards

## Troubleshooting

### Common Issues

1. **Generation Timeout**
   - Check template complexity
   - Verify data source availability
   - Monitor system resources

2. **Format Conversion Errors**
   - Validate template syntax
   - Check output format support
   - Review conversion logs

3. **Permission Denied**
   - Verify JWT token validity
   - Check user role permissions
   - Review RBAC configuration

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development DEBUG=document-automation:* pnpm run start

# Verbose logging
LOG_LEVEL=debug pnpm run start
```

### Support

- **Documentation**: [Internal Wiki](https://wiki.company.com/document-automation)
- **Issue Tracking**: [GitHub Issues](https://github.com/company/bytebot/issues)
- **Team Chat**: #document-automation Slack channel
- **Email**: document-automation@company.com

## License

Private - Internal Use Only

Copyright (c) 2024 Company Name. All rights reserved.