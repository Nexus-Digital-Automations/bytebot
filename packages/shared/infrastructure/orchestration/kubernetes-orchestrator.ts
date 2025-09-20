/**
 * PARLANT Database Function Wrapping System - Kubernetes Orchestrator
 * Container orchestration and service dependency management for 1,520+ function deployments
 */

import * as k8s from '@kubernetes/client-node';
import { ParlantConfigManager } from '../config-management/config-manager';
import { EventEmitter } from 'events';
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as fs from 'fs';

export interface ServiceDeployment {
  name: string;
  namespace: string;
  version: string;
  image: string;
  replicas: number;
  resources: {
    cpu: { request: string; limit: string };
    memory: { request: string; limit: string };
  };
  environment: Record<string, string>;
  secrets: string[];
  configMaps: string[];
  dependencies: string[];
  healthCheck: {
    readiness: HealthCheckProbe;
    liveness: HealthCheckProbe;
  };
  scaling: {
    minReplicas: number;
    maxReplicas: number;
    targetCPUUtilization: number;
    targetMemoryUtilization: number;
  };
  networking: {
    ports: ServicePort[];
    ingress?: IngressConfig;
  };
  persistence?: PersistenceConfig;
  serviceAccount?: string;
  securityContext?: SecurityContext;
}

export interface HealthCheckProbe {
  httpGet?: {
    path: string;
    port: number;
    scheme?: 'HTTP' | 'HTTPS';
  };
  exec?: {
    command: string[];
  };
  tcpSocket?: {
    port: number;
  };
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  failureThreshold: number;
  successThreshold?: number;
}

export interface ServicePort {
  name: string;
  port: number;
  targetPort: number;
  protocol: 'TCP' | 'UDP';
}

export interface IngressConfig {
  enabled: boolean;
  host: string;
  path: string;
  tls?: {
    secretName: string;
  };
  annotations?: Record<string, string>;
}

export interface PersistenceConfig {
  enabled: boolean;
  storageClass: string;
  size: string;
  mountPath: string;
  accessModes: string[];
}

export interface SecurityContext {
  runAsUser?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  readOnlyRootFilesystem?: boolean;
  allowPrivilegeEscalation?: boolean;
  capabilities?: {
    drop?: string[];
    add?: string[];
  };
}

export interface DeploymentStatus {
  name: string;
  namespace: string;
  ready: boolean;
  replicas: {
    desired: number;
    current: number;
    ready: number;
    available: number;
  };
  conditions: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
    lastUpdateTime: Date;
  }>;
  rolloutHistory: Array<{
    revision: number;
    createdAt: Date;
    image: string;
  }>;
}

export interface ServiceMesh {
  enabled: boolean;
  provider: 'istio' | 'linkerd' | 'consul';
  config: {
    mtls: boolean;
    traffic: {
      retries: number;
      timeout: string;
      circuitBreaker: {
        maxConnections: number;
        maxRetries: number;
      };
    };
    monitoring: {
      tracing: boolean;
      metrics: boolean;
    };
  };
}

export class ParlantKubernetesOrchestrator extends EventEmitter {
  private k8sApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private autoscalingApi: k8s.AutoscalingV2Api;
  private networkingApi: k8s.NetworkingV1Api;
  private configManager: ParlantConfigManager;
  private environment: string;
  private namespace: string;

  private deployments: Map<string, ServiceDeployment> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private deploymentOrder: string[] = [];

  constructor(environment: string, namespace?: string) {
    super();
    this.environment = environment;
    this.namespace = namespace || `parlant-${environment}`;
    this.configManager = new ParlantConfigManager(environment);

    this.initializeKubernetesClient();
  }

  /**
   * Initialize Kubernetes client
   */
  private initializeKubernetesClient(): void {
    const kc = new k8s.KubeConfig();

    // Load kubeconfig based on environment
    if (process.env.KUBECONFIG) {
      kc.loadFromFile(process.env.KUBECONFIG);
    } else if (process.env.KUBERNETES_SERVICE_HOST) {
      // Running inside cluster
      kc.loadFromCluster();
    } else {
      // Load from default location
      kc.loadFromDefault();
    }

    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = kc.makeApiClient(k8s.AppsV1Api);
    this.autoscalingApi = kc.makeApiClient(k8s.AutoscalingV2Api);
    this.networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
  }

  /**
   * Load service deployments from configuration
   */
  async loadServiceDeployments(): Promise<void> {
    const config = await this.configManager.loadConfiguration();
    const deploymentsPath = path.join(__dirname, 'deployments');

    if (!fs.existsSync(deploymentsPath)) {
      console.warn(`Deployments directory not found: ${deploymentsPath}`);
      return;
    }

    const deploymentFiles = fs.readdirSync(deploymentsPath)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

    for (const file of deploymentFiles) {
      const filePath = path.join(deploymentsPath, file);
      const deploymentConfig = yaml.load(fs.readFileSync(filePath, 'utf8')) as ServiceDeployment;

      // Apply environment-specific overrides
      this.applyEnvironmentOverrides(deploymentConfig, config);

      this.deployments.set(deploymentConfig.name, deploymentConfig);
      this.buildDependencyGraph(deploymentConfig);
    }

    // Calculate deployment order based on dependencies
    this.calculateDeploymentOrder();

    console.log(`Loaded ${this.deployments.size} service deployments`);
    console.log(`Deployment order: ${this.deploymentOrder.join(' -> ')}`);
  }

  /**
   * Apply environment-specific configuration overrides
   */
  private applyEnvironmentOverrides(deployment: ServiceDeployment, config: any): void {
    // Override namespace
    deployment.namespace = this.namespace;

    // Apply resource limits based on environment
    if (this.environment === 'production') {
      deployment.resources.cpu.limit = config.kubernetes.resources.cpu.limit;
      deployment.resources.memory.limit = config.kubernetes.resources.memory.limit;
      deployment.scaling.maxReplicas = Math.max(deployment.scaling.maxReplicas, 5);
    } else if (this.environment === 'development') {
      deployment.resources.cpu.limit = '500m';
      deployment.resources.memory.limit = '512Mi';
      deployment.scaling.maxReplicas = Math.min(deployment.scaling.maxReplicas, 3);
    }

    // Apply security context for production
    if (this.environment === 'production' && !deployment.securityContext) {
      deployment.securityContext = {
        runAsNonRoot: true,
        runAsUser: 1000,
        runAsGroup: 1000,
        readOnlyRootFilesystem: true,
        allowPrivilegeEscalation: false,
        capabilities: {
          drop: ['ALL']
        }
      };
    }
  }

  /**
   * Build dependency graph for deployment ordering
   */
  private buildDependencyGraph(deployment: ServiceDeployment): void {
    if (!this.dependencyGraph.has(deployment.name)) {
      this.dependencyGraph.set(deployment.name, new Set());
    }

    for (const dependency of deployment.dependencies) {
      this.dependencyGraph.get(deployment.name)!.add(dependency);
    }
  }

  /**
   * Calculate deployment order using topological sort
   */
  private calculateDeploymentOrder(): void {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (serviceName: string): void => {
      if (temp.has(serviceName)) {
        throw new Error(`Circular dependency detected involving ${serviceName}`);
      }

      if (!visited.has(serviceName)) {
        temp.add(serviceName);

        const dependencies = this.dependencyGraph.get(serviceName) || new Set();
        for (const dependency of dependencies) {
          visit(dependency);
        }

        temp.delete(serviceName);
        visited.add(serviceName);
        order.push(serviceName);
      }
    };

    for (const serviceName of this.deployments.keys()) {
      if (!visited.has(serviceName)) {
        visit(serviceName);
      }
    }

    this.deploymentOrder = order;
  }

  /**
   * Deploy all services in dependency order
   */
  async deployAllServices(options: {
    parallel?: boolean;
    skipDependencyCheck?: boolean;
    dryRun?: boolean;
  } = {}): Promise<Map<string, DeploymentStatus>> {
    await this.loadServiceDeployments();

    // Ensure namespace exists
    await this.ensureNamespace();

    const results = new Map<string, DeploymentStatus>();

    if (options.parallel && options.skipDependencyCheck) {
      // Deploy all services in parallel (ignoring dependencies)
      const deploymentPromises = Array.from(this.deployments.values()).map(
        deployment => this.deploySingleService(deployment, options.dryRun)
      );

      const deploymentResults = await Promise.allSettled(deploymentPromises);

      deploymentResults.forEach((result, index) => {
        const deployment = Array.from(this.deployments.values())[index];
        if (result.status === 'fulfilled') {
          results.set(deployment.name, result.value);
        } else {
          console.error(`Failed to deploy ${deployment.name}:`, result.reason);
        }
      });
    } else {
      // Deploy services in dependency order
      for (const serviceName of this.deploymentOrder) {
        const deployment = this.deployments.get(serviceName);
        if (!deployment) continue;

        try {
          // Wait for dependencies to be ready (unless skipped)
          if (!options.skipDependencyCheck) {
            await this.waitForDependencies(deployment.dependencies);
          }

          const status = await this.deploySingleService(deployment, options.dryRun);
          results.set(serviceName, status);

          this.emit('serviceDeployed', { serviceName, status });
        } catch (error) {
          console.error(`Failed to deploy ${serviceName}:`, error);
          this.emit('deploymentError', { serviceName, error });

          // Stop deployment on error unless explicitly continuing
          if (!options.skipDependencyCheck) {
            break;
          }
        }
      }
    }

    return results;
  }

  /**
   * Deploy a single service
   */
  async deploySingleService(deployment: ServiceDeployment, dryRun = false): Promise<DeploymentStatus> {
    console.log(`Deploying service: ${deployment.name}`);

    if (dryRun) {
      console.log(`[DRY RUN] Would deploy ${deployment.name}`);
      return this.createMockDeploymentStatus(deployment);
    }

    try {
      // Create or update ConfigMaps
      await this.deployConfigMaps(deployment);

      // Create or update Secrets
      await this.deploySecrets(deployment);

      // Create or update Service
      await this.deployService(deployment);

      // Create or update Deployment
      await this.deployK8sDeployment(deployment);

      // Create or update HPA (if scaling is configured)
      if (deployment.scaling.maxReplicas > deployment.scaling.minReplicas) {
        await this.deployHorizontalPodAutoscaler(deployment);
      }

      // Create or update Ingress (if configured)
      if (deployment.networking.ingress?.enabled) {
        await this.deployIngress(deployment);
      }

      // Create PersistentVolumeClaim (if configured)
      if (deployment.persistence?.enabled) {
        await this.deployPersistentVolumeClaim(deployment);
      }

      // Wait for deployment to be ready
      await this.waitForDeploymentReady(deployment.name, deployment.namespace);

      return await this.getDeploymentStatus(deployment.name, deployment.namespace);

    } catch (error) {
      console.error(`Failed to deploy ${deployment.name}:`, error);
      throw error;
    }
  }

  /**
   * Deploy ConfigMaps for a service
   */
  private async deployConfigMaps(deployment: ServiceDeployment): Promise<void> {
    for (const configMapName of deployment.configMaps) {
      const configMapPath = path.join(__dirname, 'configmaps', `${configMapName}.yaml`);

      if (fs.existsSync(configMapPath)) {
        const configMapData = yaml.load(fs.readFileSync(configMapPath, 'utf8')) as any;

        const configMap: k8s.V1ConfigMap = {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: configMapName,
            namespace: deployment.namespace,
            labels: {
              app: deployment.name,
              version: deployment.version,
              environment: this.environment
            }
          },
          data: configMapData.data || {}
        };

        try {
          await this.k8sApi.replaceNamespacedConfigMap(
            configMapName,
            deployment.namespace,
            configMap
          );
        } catch (error) {
          if (error.response?.statusCode === 404) {
            await this.k8sApi.createNamespacedConfigMap(deployment.namespace, configMap);
          } else {
            throw error;
          }
        }
      }
    }
  }

  /**
   * Deploy Secrets for a service
   */
  private async deploySecrets(deployment: ServiceDeployment): Promise<void> {
    for (const secretName of deployment.secrets) {
      // Load secret data from configuration manager
      const secretData = await this.loadSecretData(secretName);

      const secret: k8s.V1Secret = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: secretName,
          namespace: deployment.namespace,
          labels: {
            app: deployment.name,
            version: deployment.version,
            environment: this.environment
          }
        },
        type: 'Opaque',
        data: secretData
      };

      try {
        await this.k8sApi.replaceNamespacedSecret(
          secretName,
          deployment.namespace,
          secret
        );
      } catch (error) {
        if (error.response?.statusCode === 404) {
          await this.k8sApi.createNamespacedSecret(deployment.namespace, secret);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Load secret data from configuration manager
   */
  private async loadSecretData(secretName: string): Promise<Record<string, string>> {
    const secretData: Record<string, string> = {};

    try {
      // Load secret from configuration manager
      const secretValue = await this.configManager.getSecret(secretName);

      // If secret is JSON, parse and encode each field
      try {
        const parsedSecret = JSON.parse(secretValue);
        for (const [key, value] of Object.entries(parsedSecret)) {
          secretData[key] = Buffer.from(String(value)).toString('base64');
        }
      } catch {
        // If not JSON, treat as single value
        secretData[secretName] = Buffer.from(secretValue).toString('base64');
      }
    } catch (error) {
      console.warn(`Could not load secret ${secretName}:`, error.message);
    }

    return secretData;
  }

  /**
   * Deploy Kubernetes Service
   */
  private async deployService(deployment: ServiceDeployment): Promise<void> {
    const service: k8s.V1Service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: deployment.name,
        namespace: deployment.namespace,
        labels: {
          app: deployment.name,
          version: deployment.version,
          environment: this.environment
        }
      },
      spec: {
        selector: {
          app: deployment.name
        },
        ports: deployment.networking.ports.map(port => ({
          name: port.name,
          port: port.port,
          targetPort: port.targetPort,
          protocol: port.protocol
        })),
        type: 'ClusterIP'
      }
    };

    try {
      await this.k8sApi.replaceNamespacedService(
        deployment.name,
        deployment.namespace,
        service
      );
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sApi.createNamespacedService(deployment.namespace, service);
      } else {
        throw error;
      }
    }
  }

  /**
   * Deploy Kubernetes Deployment
   */
  private async deployK8sDeployment(deployment: ServiceDeployment): Promise<void> {
    const k8sDeployment: k8s.V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: deployment.name,
        namespace: deployment.namespace,
        labels: {
          app: deployment.name,
          version: deployment.version,
          environment: this.environment
        }
      },
      spec: {
        replicas: deployment.replicas,
        selector: {
          matchLabels: {
            app: deployment.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: deployment.name,
              version: deployment.version,
              environment: this.environment
            }
          },
          spec: {
            serviceAccountName: deployment.serviceAccount,
            securityContext: deployment.securityContext as any,
            containers: [{
              name: deployment.name,
              image: deployment.image,
              ports: deployment.networking.ports.map(port => ({
                containerPort: port.targetPort,
                protocol: port.protocol
              })),
              env: Object.entries(deployment.environment).map(([name, value]) => ({
                name,
                value
              })),
              resources: {
                requests: {
                  cpu: deployment.resources.cpu.request,
                  memory: deployment.resources.memory.request
                },
                limits: {
                  cpu: deployment.resources.cpu.limit,
                  memory: deployment.resources.memory.limit
                }
              },
              readinessProbe: this.createProbe(deployment.healthCheck.readiness),
              livenessProbe: this.createProbe(deployment.healthCheck.liveness),
              volumeMounts: deployment.persistence?.enabled ? [{
                name: 'data',
                mountPath: deployment.persistence.mountPath
              }] : undefined
            }],
            volumes: deployment.persistence?.enabled ? [{
              name: 'data',
              persistentVolumeClaim: {
                claimName: `${deployment.name}-pvc`
              }
            }] : undefined
          }
        }
      }
    };

    try {
      await this.appsApi.replaceNamespacedDeployment(
        deployment.name,
        deployment.namespace,
        k8sDeployment
      );
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.appsApi.createNamespacedDeployment(deployment.namespace, k8sDeployment);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create Kubernetes probe from health check configuration
   */
  private createProbe(healthCheck: HealthCheckProbe): k8s.V1Probe {
    const probe: k8s.V1Probe = {
      initialDelaySeconds: healthCheck.initialDelaySeconds,
      periodSeconds: healthCheck.periodSeconds,
      timeoutSeconds: healthCheck.timeoutSeconds,
      failureThreshold: healthCheck.failureThreshold,
      successThreshold: healthCheck.successThreshold || 1
    };

    if (healthCheck.httpGet) {
      probe.httpGet = {
        path: healthCheck.httpGet.path,
        port: healthCheck.httpGet.port,
        scheme: healthCheck.httpGet.scheme || 'HTTP'
      };
    } else if (healthCheck.exec) {
      probe.exec = {
        command: healthCheck.exec.command
      };
    } else if (healthCheck.tcpSocket) {
      probe.tcpSocket = {
        port: healthCheck.tcpSocket.port
      };
    }

    return probe;
  }

  /**
   * Deploy Horizontal Pod Autoscaler
   */
  private async deployHorizontalPodAutoscaler(deployment: ServiceDeployment): Promise<void> {
    const hpa: k8s.V2HorizontalPodAutoscaler = {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: `${deployment.name}-hpa`,
        namespace: deployment.namespace,
        labels: {
          app: deployment.name,
          version: deployment.version,
          environment: this.environment
        }
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: deployment.name
        },
        minReplicas: deployment.scaling.minReplicas,
        maxReplicas: deployment.scaling.maxReplicas,
        metrics: [
          {
            type: 'Resource',
            resource: {
              name: 'cpu',
              target: {
                type: 'Utilization',
                averageUtilization: deployment.scaling.targetCPUUtilization
              }
            }
          },
          {
            type: 'Resource',
            resource: {
              name: 'memory',
              target: {
                type: 'Utilization',
                averageUtilization: deployment.scaling.targetMemoryUtilization
              }
            }
          }
        ]
      }
    };

    try {
      await this.autoscalingApi.replaceNamespacedHorizontalPodAutoscaler(
        `${deployment.name}-hpa`,
        deployment.namespace,
        hpa
      );
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.autoscalingApi.createNamespacedHorizontalPodAutoscaler(
          deployment.namespace,
          hpa
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Deploy Ingress
   */
  private async deployIngress(deployment: ServiceDeployment): Promise<void> {
    if (!deployment.networking.ingress?.enabled) return;

    const ingress: k8s.V1Ingress = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: `${deployment.name}-ingress`,
        namespace: deployment.namespace,
        annotations: deployment.networking.ingress.annotations || {},
        labels: {
          app: deployment.name,
          version: deployment.version,
          environment: this.environment
        }
      },
      spec: {
        tls: deployment.networking.ingress.tls ? [{
          hosts: [deployment.networking.ingress.host],
          secretName: deployment.networking.ingress.tls.secretName
        }] : undefined,
        rules: [{
          host: deployment.networking.ingress.host,
          http: {
            paths: [{
              path: deployment.networking.ingress.path,
              pathType: 'Prefix',
              backend: {
                service: {
                  name: deployment.name,
                  port: {
                    number: deployment.networking.ports[0].port
                  }
                }
              }
            }]
          }
        }]
      }
    };

    try {
      await this.networkingApi.replaceNamespacedIngress(
        `${deployment.name}-ingress`,
        deployment.namespace,
        ingress
      );
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.networkingApi.createNamespacedIngress(deployment.namespace, ingress);
      } else {
        throw error;
      }
    }
  }

  /**
   * Deploy PersistentVolumeClaim
   */
  private async deployPersistentVolumeClaim(deployment: ServiceDeployment): Promise<void> {
    if (!deployment.persistence?.enabled) return;

    const pvc: k8s.V1PersistentVolumeClaim = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: `${deployment.name}-pvc`,
        namespace: deployment.namespace,
        labels: {
          app: deployment.name,
          version: deployment.version,
          environment: this.environment
        }
      },
      spec: {
        accessModes: deployment.persistence.accessModes,
        storageClassName: deployment.persistence.storageClass,
        resources: {
          requests: {
            storage: deployment.persistence.size
          }
        }
      }
    };

    try {
      await this.k8sApi.replaceNamespacedPersistentVolumeClaim(
        `${deployment.name}-pvc`,
        deployment.namespace,
        pvc
      );
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sApi.createNamespacedPersistentVolumeClaim(deployment.namespace, pvc);
      } else {
        throw error;
      }
    }
  }

  /**
   * Ensure namespace exists
   */
  private async ensureNamespace(): Promise<void> {
    const namespace: k8s.V1Namespace = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: this.namespace,
        labels: {
          environment: this.environment,
          'parlant.io/managed': 'true'
        }
      }
    };

    try {
      await this.k8sApi.readNamespace(this.namespace);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sApi.createNamespace(namespace);
        console.log(`Created namespace: ${this.namespace}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Wait for dependencies to be ready
   */
  private async waitForDependencies(dependencies: string[], timeout = 600000): Promise<void> {
    const startTime = Date.now();

    for (const dependency of dependencies) {
      console.log(`Waiting for dependency: ${dependency}`);

      while (Date.now() - startTime < timeout) {
        try {
          const status = await this.getDeploymentStatus(dependency, this.namespace);
          if (status.ready) {
            console.log(`Dependency ready: ${dependency}`);
            break;
          }
        } catch (error) {
          // Dependency might not exist yet
        }

        await this.sleep(5000); // Wait 5 seconds
      }

      if (Date.now() - startTime >= timeout) {
        throw new Error(`Timeout waiting for dependency: ${dependency}`);
      }
    }
  }

  /**
   * Wait for deployment to be ready
   */
  private async waitForDeploymentReady(name: string, namespace: string, timeout = 600000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getDeploymentStatus(name, namespace);
        if (status.ready) {
          console.log(`Deployment ready: ${name}`);
          return;
        }
      } catch (error) {
        console.warn(`Error checking deployment status for ${name}:`, error.message);
      }

      await this.sleep(5000); // Wait 5 seconds
    }

    throw new Error(`Timeout waiting for deployment to be ready: ${name}`);
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(name: string, namespace: string): Promise<DeploymentStatus> {
    try {
      const deployment = await this.appsApi.readNamespacedDeployment(name, namespace);
      const status = deployment.body.status!;

      return {
        name,
        namespace,
        ready: (status.readyReplicas || 0) === (status.replicas || 0),
        replicas: {
          desired: status.replicas || 0,
          current: status.updatedReplicas || 0,
          ready: status.readyReplicas || 0,
          available: status.availableReplicas || 0
        },
        conditions: (status.conditions || []).map(condition => ({
          type: condition.type,
          status: condition.status,
          reason: condition.reason,
          message: condition.message,
          lastUpdateTime: new Date(condition.lastUpdateTime!)
        })),
        rolloutHistory: [] // TODO: Implement rollout history
      };
    } catch (error) {
      throw new Error(`Failed to get deployment status for ${name}: ${error.message}`);
    }
  }

  /**
   * Create mock deployment status for dry run
   */
  private createMockDeploymentStatus(deployment: ServiceDeployment): DeploymentStatus {
    return {
      name: deployment.name,
      namespace: deployment.namespace,
      ready: true,
      replicas: {
        desired: deployment.replicas,
        current: deployment.replicas,
        ready: deployment.replicas,
        available: deployment.replicas
      },
      conditions: [{
        type: 'Available',
        status: 'True',
        reason: 'MinimumReplicasAvailable',
        message: 'Deployment has minimum availability.',
        lastUpdateTime: new Date()
      }],
      rolloutHistory: []
    };
  }

  /**
   * Scale deployment
   */
  async scaleDeployment(name: string, replicas: number): Promise<void> {
    const deployment = await this.appsApi.readNamespacedDeployment(name, this.namespace);
    deployment.body.spec!.replicas = replicas;

    await this.appsApi.replaceNamespacedDeployment(name, this.namespace, deployment.body);
    console.log(`Scaled deployment ${name} to ${replicas} replicas`);
  }

  /**
   * Delete deployment
   */
  async deleteDeployment(name: string): Promise<void> {
    try {
      await this.appsApi.deleteNamespacedDeployment(name, this.namespace);
      await this.k8sApi.deleteNamespacedService(name, this.namespace);

      // Delete HPA if it exists
      try {
        await this.autoscalingApi.deleteNamespacedHorizontalPodAutoscaler(
          `${name}-hpa`,
          this.namespace
        );
      } catch (error) {
        // HPA might not exist
      }

      // Delete Ingress if it exists
      try {
        await this.networkingApi.deleteNamespacedIngress(`${name}-ingress`, this.namespace);
      } catch (error) {
        // Ingress might not exist
      }

      console.log(`Deleted deployment: ${name}`);
    } catch (error) {
      console.error(`Failed to delete deployment ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get all deployment statuses
   */
  async getAllDeploymentStatuses(): Promise<Map<string, DeploymentStatus>> {
    const statuses = new Map<string, DeploymentStatus>();

    for (const serviceName of this.deployments.keys()) {
      try {
        const status = await this.getDeploymentStatus(serviceName, this.namespace);
        statuses.set(serviceName, status);
      } catch (error) {
        console.warn(`Could not get status for ${serviceName}:`, error.message);
      }
    }

    return statuses;
  }

  /**
   * Monitor deployments for changes
   */
  async startDeploymentMonitoring(): Promise<void> {
    // TODO: Implement Kubernetes watch for deployment changes
    console.log('Deployment monitoring started');
  }

  /**
   * Stop deployment monitoring
   */
  async stopDeploymentMonitoring(): Promise<void> {
    // TODO: Stop Kubernetes watches
    console.log('Deployment monitoring stopped');
  }

  /**
   * Utility method to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}