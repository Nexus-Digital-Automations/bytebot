#!/bin/bash

# Bytebot Browser Automation Platform - Deployment Script
# Local-only Docker deployment automation with comprehensive validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
COMPOSE_PROD_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_ROOT}/.env"
LOG_FILE="${PROJECT_ROOT}/logs/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

# Help function
show_help() {
    cat << EOF
Bytebot Browser Automation Platform - Deployment Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    start         Start all services (default)
    stop          Stop all services
    restart       Restart all services
    status        Show service status
    logs          Show service logs
    clean         Clean up containers and volumes
    validate      Validate configuration
    backup        Create backup of data volumes
    restore       Restore from backup

Options:
    -e, --env ENV      Environment (development|production) [default: development]
    -f, --force        Force operation without confirmation
    -v, --verbose      Enable verbose output
    -h, --help         Show this help message

Examples:
    $0 start                    # Start in development mode
    $0 -e production start      # Start in production mode
    $0 restart                  # Restart all services
    $0 logs browser-use         # Show browser-use service logs
    $0 clean -f                 # Force clean without confirmation

EOF
}

# Parse command line arguments
ENVIRONMENT="development"
FORCE=false
VERBOSE=false
COMMAND=""
SERVICE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        start|stop|restart|status|logs|clean|validate|backup|restore)
            COMMAND="$1"
            shift
            ;;
        *)
            if [[ -z "$SERVICE" && "$COMMAND" == "logs" ]]; then
                SERVICE="$1"
            fi
            shift
            ;;
    esac
done

# Default command
if [[ -z "$COMMAND" ]]; then
    COMMAND="start"
fi

# Setup logging
mkdir -p "$(dirname "$LOG_FILE")"

# Validate environment
validate_environment() {
    info "Validating environment..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Set compose command
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Select compose file based on environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ ! -f "$COMPOSE_PROD_FILE" ]]; then
            error "Production compose file not found: $COMPOSE_PROD_FILE"
            exit 1
        fi
        COMPOSE_FILE="$COMPOSE_PROD_FILE"
    fi
    
    success "Environment validation passed"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check for required files
    local required_files=(
        "$COMPOSE_FILE"
        "$PROJECT_ROOT/Dockerfile"
        "$PROJECT_ROOT/docker/browser-use/Dockerfile"
        "$PROJECT_ROOT/docker/nginx/nginx.conf"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file missing: $file"
            exit 1
        fi
    done
    
    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        warn "Environment file not found: $ENV_FILE"
        warn "Using default configuration"
    fi
    
    # Check available disk space (minimum 5GB)
    local available_space
    available_space=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $4}')
    local min_space=$((5 * 1024 * 1024)) # 5GB in KB
    
    if [[ "$available_space" -lt "$min_space" ]]; then
        warn "Low disk space detected. Available: $(($available_space / 1024 / 1024))GB"
    fi
    
    success "Prerequisites check passed"
}

# Validate configuration
validate_config() {
    info "Validating Docker Compose configuration..."
    
    # Validate compose file
    if ! $COMPOSE_CMD -f "$COMPOSE_FILE" config -q; then
        error "Docker Compose configuration validation failed"
        exit 1
    fi
    
    success "Configuration validation passed"
}

# Create required directories
setup_directories() {
    info "Setting up required directories..."
    
    local dirs=(
        "$PROJECT_ROOT/logs"
        "$PROJECT_ROOT/data/browser-use"
        "$PROJECT_ROOT/data/chrome-user-data"
        "$PROJECT_ROOT/data/screenshots"
        "$PROJECT_ROOT/backups"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    success "Directories setup completed"
}

# Build images
build_images() {
    info "Building Docker images..."
    
    if [[ "$VERBOSE" == "true" ]]; then
        $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache
    else
        $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache > /dev/null 2>&1
    fi
    
    success "Docker images built successfully"
}

# Start services
start_services() {
    info "Starting Bytebot Browser Automation Platform..."
    
    # Pull latest images
    info "Pulling latest images..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" pull
    
    # Build custom images
    build_images
    
    # Start services
    info "Starting services..."
    if [[ "$VERBOSE" == "true" ]]; then
        $COMPOSE_CMD -f "$COMPOSE_FILE" up -d
    else
        $COMPOSE_CMD -f "$COMPOSE_FILE" up -d > /dev/null 2>&1
    fi
    
    # Wait for services to be healthy
    info "Waiting for services to be healthy..."
    local max_wait=300 # 5 minutes
    local waited=0
    
    while [[ $waited -lt $max_wait ]]; do
        local healthy_services
        healthy_services=$($COMPOSE_CMD -f "$COMPOSE_FILE" ps --filter "status=running" --format "table {{.Service}}" | tail -n +2 | wc -l)
        local total_services
        total_services=$($COMPOSE_CMD -f "$COMPOSE_FILE" ps --format "table {{.Service}}" | tail -n +2 | wc -l)
        
        if [[ "$healthy_services" -eq "$total_services" ]] && [[ "$total_services" -gt 0 ]]; then
            success "All services are running"
            break
        fi
        
        sleep 5
        waited=$((waited + 5))
        info "Waiting for services... ($waited/$max_wait seconds)"
    done
    
    if [[ $waited -ge $max_wait ]]; then
        warn "Some services may not be healthy after $max_wait seconds"
    fi
    
    # Show status
    show_status
    
    success "Bytebot Browser Automation Platform started successfully"
    info "Access the API at: http://localhost:9991"
    info "Access monitoring at: http://localhost:3001"
}

# Stop services
stop_services() {
    info "Stopping Bytebot Browser Automation Platform..."
    
    if [[ "$VERBOSE" == "true" ]]; then
        $COMPOSE_CMD -f "$COMPOSE_FILE" down
    else
        $COMPOSE_CMD -f "$COMPOSE_FILE" down > /dev/null 2>&1
    fi
    
    success "Services stopped successfully"
}

# Restart services
restart_services() {
    info "Restarting Bytebot Browser Automation Platform..."
    stop_services
    sleep 2
    start_services
}

# Show service status
show_status() {
    info "Service Status:"
    $COMPOSE_CMD -f "$COMPOSE_FILE" ps
    
    echo ""
    info "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
        $(docker ps --filter "label=com.docker.compose.project" --format "{{.Names}}")
}

# Show logs
show_logs() {
    if [[ -n "$SERVICE" ]]; then
        info "Showing logs for service: $SERVICE"
        $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f "$SERVICE"
    else
        info "Showing logs for all services"
        $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f
    fi
}

# Clean up
clean_services() {
    if [[ "$FORCE" == "false" ]]; then
        echo -n "This will remove all containers, networks, and volumes. Are you sure? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            info "Clean operation cancelled"
            exit 0
        fi
    fi
    
    info "Cleaning up containers, networks, and volumes..."
    
    # Stop and remove containers
    $COMPOSE_CMD -f "$COMPOSE_FILE" down -v --remove-orphans
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    success "Cleanup completed"
}

# Create backup
create_backup() {
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    info "Creating backup in: $backup_dir"
    
    # Backup volumes
    local volumes=(
        "postgres_data"
        "redis_data"
        "bytebot_data"
        "browser_use_data"
    )
    
    for volume in "${volumes[@]}"; do
        info "Backing up volume: $volume"
        docker run --rm -v "${volume}:/data" -v "$backup_dir:/backup" alpine \
            tar czf "/backup/${volume}.tar.gz" -C /data .
    done
    
    # Backup configuration
    cp "$ENV_FILE" "$backup_dir/" 2>/dev/null || true
    
    success "Backup created successfully: $backup_dir"
}

# Restore from backup
restore_backup() {
    echo -n "Enter backup directory path: "
    read -r backup_path
    
    if [[ ! -d "$backup_path" ]]; then
        error "Backup directory not found: $backup_path"
        exit 1
    fi
    
    if [[ "$FORCE" == "false" ]]; then
        echo -n "This will overwrite existing data. Are you sure? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            info "Restore operation cancelled"
            exit 0
        fi
    fi
    
    info "Restoring from backup: $backup_path"
    
    # Stop services
    stop_services
    
    # Restore volumes
    local volumes=(
        "postgres_data"
        "redis_data" 
        "bytebot_data"
        "browser_use_data"
    )
    
    for volume in "${volumes[@]}"; do
        local backup_file="$backup_path/${volume}.tar.gz"
        if [[ -f "$backup_file" ]]; then
            info "Restoring volume: $volume"
            docker run --rm -v "${volume}:/data" -v "$backup_path:/backup" alpine \
                tar xzf "/backup/${volume}.tar.gz" -C /data
        fi
    done
    
    success "Restore completed successfully"
}

# Main execution
main() {
    info "Starting deployment script for environment: $ENVIRONMENT"
    
    validate_environment
    check_prerequisites
    setup_directories
    
    case "$COMMAND" in
        start)
            validate_config
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            validate_config
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        clean)
            clean_services
            ;;
        validate)
            validate_config
            success "Configuration is valid"
            ;;
        backup)
            create_backup
            ;;
        restore)
            restore_backup
            ;;
        *)
            error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"