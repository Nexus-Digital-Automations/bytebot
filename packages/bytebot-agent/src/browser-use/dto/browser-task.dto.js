"use strict";
/**
 * Browser Task DTOs
 *
 * Data Transfer Objects for browser automation task operations.
 * Defines the structure for creating, updating, and responding with task data.
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserTaskListResponseDto = exports.BrowserTaskStatusDto = exports.BrowserTaskResponseDto = exports.BrowserTaskExecutionStep = exports.UpdateBrowserTaskDto = exports.CreateBrowserTaskDto = exports.BrowserTaskConstraints = exports.BrowserTaskPriority = exports.BrowserTaskStatus = void 0;
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var swagger_1 = require("@nestjs/swagger");
var BrowserTaskStatus;
(function (BrowserTaskStatus) {
    BrowserTaskStatus["PENDING"] = "pending";
    BrowserTaskStatus["RUNNING"] = "running";
    BrowserTaskStatus["COMPLETED"] = "completed";
    BrowserTaskStatus["FAILED"] = "failed";
    BrowserTaskStatus["CANCELLED"] = "cancelled";
})(BrowserTaskStatus || (exports.BrowserTaskStatus = BrowserTaskStatus = {}));
var BrowserTaskPriority;
(function (BrowserTaskPriority) {
    BrowserTaskPriority["LOW"] = "low";
    BrowserTaskPriority["NORMAL"] = "normal";
    BrowserTaskPriority["HIGH"] = "high";
    BrowserTaskPriority["URGENT"] = "urgent";
})(BrowserTaskPriority || (exports.BrowserTaskPriority = BrowserTaskPriority = {}));
var BrowserTaskConstraints = function () {
    var _a;
    var _maxExecutionTime_decorators;
    var _maxExecutionTime_initializers = [];
    var _maxExecutionTime_extraInitializers = [];
    var _maxActions_decorators;
    var _maxActions_initializers = [];
    var _maxActions_extraInitializers = [];
    var _allowedDomains_decorators;
    var _allowedDomains_initializers = [];
    var _allowedDomains_extraInitializers = [];
    var _blockedDomains_decorators;
    var _blockedDomains_initializers = [];
    var _blockedDomains_extraInitializers = [];
    var _enableScreenshots_decorators;
    var _enableScreenshots_initializers = [];
    var _enableScreenshots_extraInitializers = [];
    var _enableVideoRecording_decorators;
    var _enableVideoRecording_initializers = [];
    var _enableVideoRecording_extraInitializers = [];
    return _a = /** @class */ (function () {
            function BrowserTaskConstraints() {
                this.maxExecutionTime = __runInitializers(this, _maxExecutionTime_initializers, void 0);
                this.maxActions = (__runInitializers(this, _maxExecutionTime_extraInitializers), __runInitializers(this, _maxActions_initializers, void 0));
                this.allowedDomains = (__runInitializers(this, _maxActions_extraInitializers), __runInitializers(this, _allowedDomains_initializers, void 0));
                this.blockedDomains = (__runInitializers(this, _allowedDomains_extraInitializers), __runInitializers(this, _blockedDomains_initializers, void 0));
                this.enableScreenshots = (__runInitializers(this, _blockedDomains_extraInitializers), __runInitializers(this, _enableScreenshots_initializers, void 0));
                this.enableVideoRecording = (__runInitializers(this, _enableScreenshots_extraInitializers), __runInitializers(this, _enableVideoRecording_initializers, void 0));
                __runInitializers(this, _enableVideoRecording_extraInitializers);
            }
            return BrowserTaskConstraints;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _maxExecutionTime_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Maximum execution time in seconds',
                    minimum: 1,
                    maximum: 3600,
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_validator_1.Max)(3600)];
            _maxActions_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Maximum number of browser actions to perform',
                    minimum: 1,
                    maximum: 1000,
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_validator_1.Max)(1000)];
            _allowedDomains_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'List of allowed domains for navigation',
                    type: [String],
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _blockedDomains_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'List of blocked domains',
                    type: [String],
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _enableScreenshots_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Enable screenshot capture during execution',
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _enableVideoRecording_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Enable video recording of task execution',
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _maxExecutionTime_decorators, { kind: "field", name: "maxExecutionTime", static: false, private: false, access: { has: function (obj) { return "maxExecutionTime" in obj; }, get: function (obj) { return obj.maxExecutionTime; }, set: function (obj, value) { obj.maxExecutionTime = value; } }, metadata: _metadata }, _maxExecutionTime_initializers, _maxExecutionTime_extraInitializers);
            __esDecorate(null, null, _maxActions_decorators, { kind: "field", name: "maxActions", static: false, private: false, access: { has: function (obj) { return "maxActions" in obj; }, get: function (obj) { return obj.maxActions; }, set: function (obj, value) { obj.maxActions = value; } }, metadata: _metadata }, _maxActions_initializers, _maxActions_extraInitializers);
            __esDecorate(null, null, _allowedDomains_decorators, { kind: "field", name: "allowedDomains", static: false, private: false, access: { has: function (obj) { return "allowedDomains" in obj; }, get: function (obj) { return obj.allowedDomains; }, set: function (obj, value) { obj.allowedDomains = value; } }, metadata: _metadata }, _allowedDomains_initializers, _allowedDomains_extraInitializers);
            __esDecorate(null, null, _blockedDomains_decorators, { kind: "field", name: "blockedDomains", static: false, private: false, access: { has: function (obj) { return "blockedDomains" in obj; }, get: function (obj) { return obj.blockedDomains; }, set: function (obj, value) { obj.blockedDomains = value; } }, metadata: _metadata }, _blockedDomains_initializers, _blockedDomains_extraInitializers);
            __esDecorate(null, null, _enableScreenshots_decorators, { kind: "field", name: "enableScreenshots", static: false, private: false, access: { has: function (obj) { return "enableScreenshots" in obj; }, get: function (obj) { return obj.enableScreenshots; }, set: function (obj, value) { obj.enableScreenshots = value; } }, metadata: _metadata }, _enableScreenshots_initializers, _enableScreenshots_extraInitializers);
            __esDecorate(null, null, _enableVideoRecording_decorators, { kind: "field", name: "enableVideoRecording", static: false, private: false, access: { has: function (obj) { return "enableVideoRecording" in obj; }, get: function (obj) { return obj.enableVideoRecording; }, set: function (obj, value) { obj.enableVideoRecording = value; } }, metadata: _metadata }, _enableVideoRecording_initializers, _enableVideoRecording_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.BrowserTaskConstraints = BrowserTaskConstraints;
var CreateBrowserTaskDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _startUrl_decorators;
    var _startUrl_initializers = [];
    var _startUrl_extraInitializers = [];
    var _priority_decorators;
    var _priority_initializers = [];
    var _priority_extraInitializers = [];
    var _constraints_decorators;
    var _constraints_initializers = [];
    var _constraints_extraInitializers = [];
    var _config_decorators;
    var _config_initializers = [];
    var _config_extraInitializers = [];
    var _tags_decorators;
    var _tags_initializers = [];
    var _tags_extraInitializers = [];
    var _autoStart_decorators;
    var _autoStart_initializers = [];
    var _autoStart_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateBrowserTaskDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.description = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.startUrl = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _startUrl_initializers, void 0));
                this.priority = (__runInitializers(this, _startUrl_extraInitializers), __runInitializers(this, _priority_initializers, BrowserTaskPriority.NORMAL));
                this.constraints = (__runInitializers(this, _priority_extraInitializers), __runInitializers(this, _constraints_initializers, void 0));
                this.config = (__runInitializers(this, _constraints_extraInitializers), __runInitializers(this, _config_initializers, void 0));
                this.tags = (__runInitializers(this, _config_extraInitializers), __runInitializers(this, _tags_initializers, void 0));
                this.autoStart = (__runInitializers(this, _tags_extraInitializers), __runInitializers(this, _autoStart_initializers, false));
                __runInitializers(this, _autoStart_extraInitializers);
            }
            return CreateBrowserTaskDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Human-readable name for the task',
                    minLength: 1,
                    maxLength: 255,
                }), (0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(1), (0, class_validator_1.MaxLength)(255)];
            _description_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Detailed description of the task to be performed by the browser agent',
                    minLength: 10,
                    maxLength: 2000,
                }), (0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(10), (0, class_validator_1.MaxLength)(2000)];
            _startUrl_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Initial URL to start the task from',
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsUrl)()];
            _priority_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Task priority level',
                    enum: BrowserTaskPriority,
                    default: BrowserTaskPriority.NORMAL,
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsEnum)(BrowserTaskPriority)];
            _constraints_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Task execution constraints and limitations',
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.ValidateNested)(), (0, class_transformer_1.Type)(function () { return BrowserTaskConstraints; })];
            _config_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Additional configuration parameters',
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsObject)()];
            _tags_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Tags for organizing and filtering tasks',
                    type: [String],
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _autoStart_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Whether to start execution immediately upon creation',
                    default: false,
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _startUrl_decorators, { kind: "field", name: "startUrl", static: false, private: false, access: { has: function (obj) { return "startUrl" in obj; }, get: function (obj) { return obj.startUrl; }, set: function (obj, value) { obj.startUrl = value; } }, metadata: _metadata }, _startUrl_initializers, _startUrl_extraInitializers);
            __esDecorate(null, null, _priority_decorators, { kind: "field", name: "priority", static: false, private: false, access: { has: function (obj) { return "priority" in obj; }, get: function (obj) { return obj.priority; }, set: function (obj, value) { obj.priority = value; } }, metadata: _metadata }, _priority_initializers, _priority_extraInitializers);
            __esDecorate(null, null, _constraints_decorators, { kind: "field", name: "constraints", static: false, private: false, access: { has: function (obj) { return "constraints" in obj; }, get: function (obj) { return obj.constraints; }, set: function (obj, value) { obj.constraints = value; } }, metadata: _metadata }, _constraints_initializers, _constraints_extraInitializers);
            __esDecorate(null, null, _config_decorators, { kind: "field", name: "config", static: false, private: false, access: { has: function (obj) { return "config" in obj; }, get: function (obj) { return obj.config; }, set: function (obj, value) { obj.config = value; } }, metadata: _metadata }, _config_initializers, _config_extraInitializers);
            __esDecorate(null, null, _tags_decorators, { kind: "field", name: "tags", static: false, private: false, access: { has: function (obj) { return "tags" in obj; }, get: function (obj) { return obj.tags; }, set: function (obj, value) { obj.tags = value; } }, metadata: _metadata }, _tags_initializers, _tags_extraInitializers);
            __esDecorate(null, null, _autoStart_decorators, { kind: "field", name: "autoStart", static: false, private: false, access: { has: function (obj) { return "autoStart" in obj; }, get: function (obj) { return obj.autoStart; }, set: function (obj, value) { obj.autoStart = value; } }, metadata: _metadata }, _autoStart_initializers, _autoStart_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateBrowserTaskDto = CreateBrowserTaskDto;
var UpdateBrowserTaskDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _priority_decorators;
    var _priority_initializers = [];
    var _priority_extraInitializers = [];
    var _constraints_decorators;
    var _constraints_initializers = [];
    var _constraints_extraInitializers = [];
    var _config_decorators;
    var _config_initializers = [];
    var _config_extraInitializers = [];
    var _tags_decorators;
    var _tags_initializers = [];
    var _tags_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateBrowserTaskDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.description = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.priority = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _priority_initializers, void 0));
                this.constraints = (__runInitializers(this, _priority_extraInitializers), __runInitializers(this, _constraints_initializers, void 0));
                this.config = (__runInitializers(this, _constraints_extraInitializers), __runInitializers(this, _config_initializers, void 0));
                this.tags = (__runInitializers(this, _config_extraInitializers), __runInitializers(this, _tags_initializers, void 0));
                __runInitializers(this, _tags_extraInitializers);
            }
            return UpdateBrowserTaskDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Updated task name',
                    minLength: 1,
                    maxLength: 255,
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(1), (0, class_validator_1.MaxLength)(255)];
            _description_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Updated task description',
                    minLength: 10,
                    maxLength: 2000,
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(10), (0, class_validator_1.MaxLength)(2000)];
            _priority_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Updated task priority',
                    enum: BrowserTaskPriority,
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsEnum)(BrowserTaskPriority)];
            _constraints_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Updated task constraints',
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.ValidateNested)(), (0, class_transformer_1.Type)(function () { return BrowserTaskConstraints; })];
            _config_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Updated configuration parameters',
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsObject)()];
            _tags_decorators = [(0, swagger_1.ApiPropertyOptional)({
                    description: 'Updated tags',
                    type: [String],
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _priority_decorators, { kind: "field", name: "priority", static: false, private: false, access: { has: function (obj) { return "priority" in obj; }, get: function (obj) { return obj.priority; }, set: function (obj, value) { obj.priority = value; } }, metadata: _metadata }, _priority_initializers, _priority_extraInitializers);
            __esDecorate(null, null, _constraints_decorators, { kind: "field", name: "constraints", static: false, private: false, access: { has: function (obj) { return "constraints" in obj; }, get: function (obj) { return obj.constraints; }, set: function (obj, value) { obj.constraints = value; } }, metadata: _metadata }, _constraints_initializers, _constraints_extraInitializers);
            __esDecorate(null, null, _config_decorators, { kind: "field", name: "config", static: false, private: false, access: { has: function (obj) { return "config" in obj; }, get: function (obj) { return obj.config; }, set: function (obj, value) { obj.config = value; } }, metadata: _metadata }, _config_initializers, _config_extraInitializers);
            __esDecorate(null, null, _tags_decorators, { kind: "field", name: "tags", static: false, private: false, access: { has: function (obj) { return "tags" in obj; }, get: function (obj) { return obj.tags; }, set: function (obj, value) { obj.tags = value; } }, metadata: _metadata }, _tags_initializers, _tags_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateBrowserTaskDto = UpdateBrowserTaskDto;
var BrowserTaskExecutionStep = function () {
    var _a;
    var _stepNumber_decorators;
    var _stepNumber_initializers = [];
    var _stepNumber_extraInitializers = [];
    var _action_decorators;
    var _action_initializers = [];
    var _action_extraInitializers = [];
    var _target_decorators;
    var _target_initializers = [];
    var _target_extraInitializers = [];
    var _result_decorators;
    var _result_initializers = [];
    var _result_extraInitializers = [];
    var _timestamp_decorators;
    var _timestamp_initializers = [];
    var _timestamp_extraInitializers = [];
    var _screenshot_decorators;
    var _screenshot_initializers = [];
    var _screenshot_extraInitializers = [];
    var _success_decorators;
    var _success_initializers = [];
    var _success_extraInitializers = [];
    var _error_decorators;
    var _error_initializers = [];
    var _error_extraInitializers = [];
    return _a = /** @class */ (function () {
            function BrowserTaskExecutionStep() {
                this.stepNumber = __runInitializers(this, _stepNumber_initializers, void 0);
                this.action = (__runInitializers(this, _stepNumber_extraInitializers), __runInitializers(this, _action_initializers, void 0));
                this.target = (__runInitializers(this, _action_extraInitializers), __runInitializers(this, _target_initializers, void 0));
                this.result = (__runInitializers(this, _target_extraInitializers), __runInitializers(this, _result_initializers, void 0));
                this.timestamp = (__runInitializers(this, _result_extraInitializers), __runInitializers(this, _timestamp_initializers, void 0));
                this.screenshot = (__runInitializers(this, _timestamp_extraInitializers), __runInitializers(this, _screenshot_initializers, void 0));
                this.success = (__runInitializers(this, _screenshot_extraInitializers), __runInitializers(this, _success_initializers, void 0));
                this.error = (__runInitializers(this, _success_extraInitializers), __runInitializers(this, _error_initializers, void 0));
                __runInitializers(this, _error_extraInitializers);
            }
            return BrowserTaskExecutionStep;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _stepNumber_decorators = [(0, swagger_1.ApiProperty)({ description: 'Step number in execution sequence' })];
            _action_decorators = [(0, swagger_1.ApiProperty)({ description: 'Action performed in this step' })];
            _target_decorators = [(0, swagger_1.ApiProperty)({ description: 'Target element or URL for the action' })];
            _result_decorators = [(0, swagger_1.ApiProperty)({ description: 'Result of the action' })];
            _timestamp_decorators = [(0, swagger_1.ApiProperty)({ description: 'Timestamp of step execution' })];
            _screenshot_decorators = [(0, swagger_1.ApiProperty)({ description: 'Screenshot captured during this step (base64)' })];
            _success_decorators = [(0, swagger_1.ApiProperty)({ description: 'Whether this step was successful' })];
            _error_decorators = [(0, swagger_1.ApiProperty)({ description: 'Error message if step failed' })];
            __esDecorate(null, null, _stepNumber_decorators, { kind: "field", name: "stepNumber", static: false, private: false, access: { has: function (obj) { return "stepNumber" in obj; }, get: function (obj) { return obj.stepNumber; }, set: function (obj, value) { obj.stepNumber = value; } }, metadata: _metadata }, _stepNumber_initializers, _stepNumber_extraInitializers);
            __esDecorate(null, null, _action_decorators, { kind: "field", name: "action", static: false, private: false, access: { has: function (obj) { return "action" in obj; }, get: function (obj) { return obj.action; }, set: function (obj, value) { obj.action = value; } }, metadata: _metadata }, _action_initializers, _action_extraInitializers);
            __esDecorate(null, null, _target_decorators, { kind: "field", name: "target", static: false, private: false, access: { has: function (obj) { return "target" in obj; }, get: function (obj) { return obj.target; }, set: function (obj, value) { obj.target = value; } }, metadata: _metadata }, _target_initializers, _target_extraInitializers);
            __esDecorate(null, null, _result_decorators, { kind: "field", name: "result", static: false, private: false, access: { has: function (obj) { return "result" in obj; }, get: function (obj) { return obj.result; }, set: function (obj, value) { obj.result = value; } }, metadata: _metadata }, _result_initializers, _result_extraInitializers);
            __esDecorate(null, null, _timestamp_decorators, { kind: "field", name: "timestamp", static: false, private: false, access: { has: function (obj) { return "timestamp" in obj; }, get: function (obj) { return obj.timestamp; }, set: function (obj, value) { obj.timestamp = value; } }, metadata: _metadata }, _timestamp_initializers, _timestamp_extraInitializers);
            __esDecorate(null, null, _screenshot_decorators, { kind: "field", name: "screenshot", static: false, private: false, access: { has: function (obj) { return "screenshot" in obj; }, get: function (obj) { return obj.screenshot; }, set: function (obj, value) { obj.screenshot = value; } }, metadata: _metadata }, _screenshot_initializers, _screenshot_extraInitializers);
            __esDecorate(null, null, _success_decorators, { kind: "field", name: "success", static: false, private: false, access: { has: function (obj) { return "success" in obj; }, get: function (obj) { return obj.success; }, set: function (obj, value) { obj.success = value; } }, metadata: _metadata }, _success_initializers, _success_extraInitializers);
            __esDecorate(null, null, _error_decorators, { kind: "field", name: "error", static: false, private: false, access: { has: function (obj) { return "error" in obj; }, get: function (obj) { return obj.error; }, set: function (obj, value) { obj.error = value; } }, metadata: _metadata }, _error_initializers, _error_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.BrowserTaskExecutionStep = BrowserTaskExecutionStep;
var BrowserTaskResponseDto = function () {
    var _a;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _priority_decorators;
    var _priority_initializers = [];
    var _priority_extraInitializers = [];
    var _startUrl_decorators;
    var _startUrl_initializers = [];
    var _startUrl_extraInitializers = [];
    var _constraints_decorators;
    var _constraints_initializers = [];
    var _constraints_extraInitializers = [];
    var _config_decorators;
    var _config_initializers = [];
    var _config_extraInitializers = [];
    var _tags_decorators;
    var _tags_initializers = [];
    var _tags_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var _startedAt_decorators;
    var _startedAt_initializers = [];
    var _startedAt_extraInitializers = [];
    var _completedAt_decorators;
    var _completedAt_initializers = [];
    var _completedAt_extraInitializers = [];
    var _createdBy_decorators;
    var _createdBy_initializers = [];
    var _createdBy_extraInitializers = [];
    var _sessionId_decorators;
    var _sessionId_initializers = [];
    var _sessionId_extraInitializers = [];
    var _progress_decorators;
    var _progress_initializers = [];
    var _progress_extraInitializers = [];
    var _totalSteps_decorators;
    var _totalSteps_initializers = [];
    var _totalSteps_extraInitializers = [];
    var _completedSteps_decorators;
    var _completedSteps_initializers = [];
    var _completedSteps_extraInitializers = [];
    var _executionSteps_decorators;
    var _executionSteps_initializers = [];
    var _executionSteps_extraInitializers = [];
    var _result_decorators;
    var _result_initializers = [];
    var _result_extraInitializers = [];
    var _error_decorators;
    var _error_initializers = [];
    var _error_extraInitializers = [];
    var _metrics_decorators;
    var _metrics_initializers = [];
    var _metrics_extraInitializers = [];
    return _a = /** @class */ (function () {
            function BrowserTaskResponseDto() {
                this.id = __runInitializers(this, _id_initializers, void 0);
                this.name = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _name_initializers, void 0));
                this.description = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.status = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.priority = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _priority_initializers, void 0));
                this.startUrl = (__runInitializers(this, _priority_extraInitializers), __runInitializers(this, _startUrl_initializers, void 0));
                this.constraints = (__runInitializers(this, _startUrl_extraInitializers), __runInitializers(this, _constraints_initializers, void 0));
                this.config = (__runInitializers(this, _constraints_extraInitializers), __runInitializers(this, _config_initializers, void 0));
                this.tags = (__runInitializers(this, _config_extraInitializers), __runInitializers(this, _tags_initializers, void 0));
                this.createdAt = (__runInitializers(this, _tags_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
                this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
                this.startedAt = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _startedAt_initializers, void 0));
                this.completedAt = (__runInitializers(this, _startedAt_extraInitializers), __runInitializers(this, _completedAt_initializers, void 0));
                this.createdBy = (__runInitializers(this, _completedAt_extraInitializers), __runInitializers(this, _createdBy_initializers, void 0));
                this.sessionId = (__runInitializers(this, _createdBy_extraInitializers), __runInitializers(this, _sessionId_initializers, void 0));
                this.progress = (__runInitializers(this, _sessionId_extraInitializers), __runInitializers(this, _progress_initializers, void 0));
                this.totalSteps = (__runInitializers(this, _progress_extraInitializers), __runInitializers(this, _totalSteps_initializers, void 0));
                this.completedSteps = (__runInitializers(this, _totalSteps_extraInitializers), __runInitializers(this, _completedSteps_initializers, void 0));
                this.executionSteps = (__runInitializers(this, _completedSteps_extraInitializers), __runInitializers(this, _executionSteps_initializers, void 0));
                this.result = (__runInitializers(this, _executionSteps_extraInitializers), __runInitializers(this, _result_initializers, void 0));
                this.error = (__runInitializers(this, _result_extraInitializers), __runInitializers(this, _error_initializers, void 0));
                this.metrics = (__runInitializers(this, _error_extraInitializers), __runInitializers(this, _metrics_initializers, void 0));
                __runInitializers(this, _metrics_extraInitializers);
            }
            return BrowserTaskResponseDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _id_decorators = [(0, swagger_1.ApiProperty)({ description: 'Unique task identifier' })];
            _name_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task name' })];
            _description_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task description' })];
            _status_decorators = [(0, swagger_1.ApiProperty)({ description: 'Current task status', enum: BrowserTaskStatus })];
            _priority_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Task priority level',
                    enum: BrowserTaskPriority,
                })];
            _startUrl_decorators = [(0, swagger_1.ApiProperty)({ description: 'Initial URL for the task' })];
            _constraints_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task constraints and limitations' })];
            _config_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task configuration parameters' })];
            _tags_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task tags', type: [String] })];
            _createdAt_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task creation timestamp' })];
            _updatedAt_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task last updated timestamp' })];
            _startedAt_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task execution start timestamp' })];
            _completedAt_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task completion timestamp' })];
            _createdBy_decorators = [(0, swagger_1.ApiProperty)({ description: 'User who created the task' })];
            _sessionId_decorators = [(0, swagger_1.ApiProperty)({ description: 'Browser session ID associated with this task' })];
            _progress_decorators = [(0, swagger_1.ApiProperty)({ description: 'Current execution progress (0-100)' })];
            _totalSteps_decorators = [(0, swagger_1.ApiProperty)({ description: 'Total number of execution steps' })];
            _completedSteps_decorators = [(0, swagger_1.ApiProperty)({ description: 'Number of completed steps' })];
            _executionSteps_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Detailed execution steps',
                    type: [BrowserTaskExecutionStep],
                })];
            _result_decorators = [(0, swagger_1.ApiProperty)({ description: 'Final result of task execution' })];
            _error_decorators = [(0, swagger_1.ApiProperty)({ description: 'Error information if task failed' })];
            _metrics_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task execution metrics' })];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _priority_decorators, { kind: "field", name: "priority", static: false, private: false, access: { has: function (obj) { return "priority" in obj; }, get: function (obj) { return obj.priority; }, set: function (obj, value) { obj.priority = value; } }, metadata: _metadata }, _priority_initializers, _priority_extraInitializers);
            __esDecorate(null, null, _startUrl_decorators, { kind: "field", name: "startUrl", static: false, private: false, access: { has: function (obj) { return "startUrl" in obj; }, get: function (obj) { return obj.startUrl; }, set: function (obj, value) { obj.startUrl = value; } }, metadata: _metadata }, _startUrl_initializers, _startUrl_extraInitializers);
            __esDecorate(null, null, _constraints_decorators, { kind: "field", name: "constraints", static: false, private: false, access: { has: function (obj) { return "constraints" in obj; }, get: function (obj) { return obj.constraints; }, set: function (obj, value) { obj.constraints = value; } }, metadata: _metadata }, _constraints_initializers, _constraints_extraInitializers);
            __esDecorate(null, null, _config_decorators, { kind: "field", name: "config", static: false, private: false, access: { has: function (obj) { return "config" in obj; }, get: function (obj) { return obj.config; }, set: function (obj, value) { obj.config = value; } }, metadata: _metadata }, _config_initializers, _config_extraInitializers);
            __esDecorate(null, null, _tags_decorators, { kind: "field", name: "tags", static: false, private: false, access: { has: function (obj) { return "tags" in obj; }, get: function (obj) { return obj.tags; }, set: function (obj, value) { obj.tags = value; } }, metadata: _metadata }, _tags_initializers, _tags_extraInitializers);
            __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
            __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
            __esDecorate(null, null, _startedAt_decorators, { kind: "field", name: "startedAt", static: false, private: false, access: { has: function (obj) { return "startedAt" in obj; }, get: function (obj) { return obj.startedAt; }, set: function (obj, value) { obj.startedAt = value; } }, metadata: _metadata }, _startedAt_initializers, _startedAt_extraInitializers);
            __esDecorate(null, null, _completedAt_decorators, { kind: "field", name: "completedAt", static: false, private: false, access: { has: function (obj) { return "completedAt" in obj; }, get: function (obj) { return obj.completedAt; }, set: function (obj, value) { obj.completedAt = value; } }, metadata: _metadata }, _completedAt_initializers, _completedAt_extraInitializers);
            __esDecorate(null, null, _createdBy_decorators, { kind: "field", name: "createdBy", static: false, private: false, access: { has: function (obj) { return "createdBy" in obj; }, get: function (obj) { return obj.createdBy; }, set: function (obj, value) { obj.createdBy = value; } }, metadata: _metadata }, _createdBy_initializers, _createdBy_extraInitializers);
            __esDecorate(null, null, _sessionId_decorators, { kind: "field", name: "sessionId", static: false, private: false, access: { has: function (obj) { return "sessionId" in obj; }, get: function (obj) { return obj.sessionId; }, set: function (obj, value) { obj.sessionId = value; } }, metadata: _metadata }, _sessionId_initializers, _sessionId_extraInitializers);
            __esDecorate(null, null, _progress_decorators, { kind: "field", name: "progress", static: false, private: false, access: { has: function (obj) { return "progress" in obj; }, get: function (obj) { return obj.progress; }, set: function (obj, value) { obj.progress = value; } }, metadata: _metadata }, _progress_initializers, _progress_extraInitializers);
            __esDecorate(null, null, _totalSteps_decorators, { kind: "field", name: "totalSteps", static: false, private: false, access: { has: function (obj) { return "totalSteps" in obj; }, get: function (obj) { return obj.totalSteps; }, set: function (obj, value) { obj.totalSteps = value; } }, metadata: _metadata }, _totalSteps_initializers, _totalSteps_extraInitializers);
            __esDecorate(null, null, _completedSteps_decorators, { kind: "field", name: "completedSteps", static: false, private: false, access: { has: function (obj) { return "completedSteps" in obj; }, get: function (obj) { return obj.completedSteps; }, set: function (obj, value) { obj.completedSteps = value; } }, metadata: _metadata }, _completedSteps_initializers, _completedSteps_extraInitializers);
            __esDecorate(null, null, _executionSteps_decorators, { kind: "field", name: "executionSteps", static: false, private: false, access: { has: function (obj) { return "executionSteps" in obj; }, get: function (obj) { return obj.executionSteps; }, set: function (obj, value) { obj.executionSteps = value; } }, metadata: _metadata }, _executionSteps_initializers, _executionSteps_extraInitializers);
            __esDecorate(null, null, _result_decorators, { kind: "field", name: "result", static: false, private: false, access: { has: function (obj) { return "result" in obj; }, get: function (obj) { return obj.result; }, set: function (obj, value) { obj.result = value; } }, metadata: _metadata }, _result_initializers, _result_extraInitializers);
            __esDecorate(null, null, _error_decorators, { kind: "field", name: "error", static: false, private: false, access: { has: function (obj) { return "error" in obj; }, get: function (obj) { return obj.error; }, set: function (obj, value) { obj.error = value; } }, metadata: _metadata }, _error_initializers, _error_extraInitializers);
            __esDecorate(null, null, _metrics_decorators, { kind: "field", name: "metrics", static: false, private: false, access: { has: function (obj) { return "metrics" in obj; }, get: function (obj) { return obj.metrics; }, set: function (obj, value) { obj.metrics = value; } }, metadata: _metadata }, _metrics_initializers, _metrics_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.BrowserTaskResponseDto = BrowserTaskResponseDto;
var BrowserTaskStatusDto = function () {
    var _a;
    var _success_decorators;
    var _success_initializers = [];
    var _success_extraInitializers = [];
    var _taskId_decorators;
    var _taskId_initializers = [];
    var _taskId_extraInitializers = [];
    var _found_decorators;
    var _found_initializers = [];
    var _found_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _progress_decorators;
    var _progress_initializers = [];
    var _progress_extraInitializers = [];
    var _timing_decorators;
    var _timing_initializers = [];
    var _timing_extraInitializers = [];
    var _sessionId_decorators;
    var _sessionId_initializers = [];
    var _sessionId_extraInitializers = [];
    var _metrics_decorators;
    var _metrics_initializers = [];
    var _metrics_extraInitializers = [];
    var _executionSteps_decorators;
    var _executionSteps_initializers = [];
    var _executionSteps_extraInitializers = [];
    var _executionTime_decorators;
    var _executionTime_initializers = [];
    var _executionTime_extraInitializers = [];
    var _result_decorators;
    var _result_initializers = [];
    var _result_extraInitializers = [];
    var _error_decorators;
    var _error_initializers = [];
    var _error_extraInitializers = [];
    var _timestamp_decorators;
    var _timestamp_initializers = [];
    var _timestamp_extraInitializers = [];
    return _a = /** @class */ (function () {
            function BrowserTaskStatusDto() {
                this.success = __runInitializers(this, _success_initializers, void 0);
                this.taskId = (__runInitializers(this, _success_extraInitializers), __runInitializers(this, _taskId_initializers, void 0));
                this.found = (__runInitializers(this, _taskId_extraInitializers), __runInitializers(this, _found_initializers, void 0));
                this.status = (__runInitializers(this, _found_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.progress = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _progress_initializers, void 0));
                this.timing = (__runInitializers(this, _progress_extraInitializers), __runInitializers(this, _timing_initializers, void 0));
                this.sessionId = (__runInitializers(this, _timing_extraInitializers), __runInitializers(this, _sessionId_initializers, void 0));
                this.metrics = (__runInitializers(this, _sessionId_extraInitializers), __runInitializers(this, _metrics_initializers, void 0));
                this.executionSteps = (__runInitializers(this, _metrics_extraInitializers), __runInitializers(this, _executionSteps_initializers, void 0));
                this.executionTime = (__runInitializers(this, _executionSteps_extraInitializers), __runInitializers(this, _executionTime_initializers, void 0));
                this.result = (__runInitializers(this, _executionTime_extraInitializers), __runInitializers(this, _result_initializers, void 0));
                this.error = (__runInitializers(this, _result_extraInitializers), __runInitializers(this, _error_initializers, void 0));
                this.timestamp = (__runInitializers(this, _error_extraInitializers), __runInitializers(this, _timestamp_initializers, void 0));
                __runInitializers(this, _timestamp_extraInitializers);
            }
            return BrowserTaskStatusDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _success_decorators = [(0, swagger_1.ApiProperty)({ description: 'Operation success status' })];
            _taskId_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task identifier' })];
            _found_decorators = [(0, swagger_1.ApiProperty)({ description: 'Whether the task was found' })];
            _status_decorators = [(0, swagger_1.ApiProperty)({ description: 'Current task status', enum: BrowserTaskStatus })];
            _progress_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task progress information' })];
            _timing_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task timing information' })];
            _sessionId_decorators = [(0, swagger_1.ApiProperty)({ description: 'Associated browser session ID' })];
            _metrics_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task execution metrics' })];
            _executionSteps_decorators = [(0, swagger_1.ApiProperty)({ description: 'Execution steps' })];
            _executionTime_decorators = [(0, swagger_1.ApiProperty)({ description: 'Legacy execution time property' })];
            _result_decorators = [(0, swagger_1.ApiProperty)({ description: 'Task result data' })];
            _error_decorators = [(0, swagger_1.ApiProperty)({ description: 'Error information if task failed' })];
            _timestamp_decorators = [(0, swagger_1.ApiProperty)({ description: 'Response timestamp' })];
            __esDecorate(null, null, _success_decorators, { kind: "field", name: "success", static: false, private: false, access: { has: function (obj) { return "success" in obj; }, get: function (obj) { return obj.success; }, set: function (obj, value) { obj.success = value; } }, metadata: _metadata }, _success_initializers, _success_extraInitializers);
            __esDecorate(null, null, _taskId_decorators, { kind: "field", name: "taskId", static: false, private: false, access: { has: function (obj) { return "taskId" in obj; }, get: function (obj) { return obj.taskId; }, set: function (obj, value) { obj.taskId = value; } }, metadata: _metadata }, _taskId_initializers, _taskId_extraInitializers);
            __esDecorate(null, null, _found_decorators, { kind: "field", name: "found", static: false, private: false, access: { has: function (obj) { return "found" in obj; }, get: function (obj) { return obj.found; }, set: function (obj, value) { obj.found = value; } }, metadata: _metadata }, _found_initializers, _found_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _progress_decorators, { kind: "field", name: "progress", static: false, private: false, access: { has: function (obj) { return "progress" in obj; }, get: function (obj) { return obj.progress; }, set: function (obj, value) { obj.progress = value; } }, metadata: _metadata }, _progress_initializers, _progress_extraInitializers);
            __esDecorate(null, null, _timing_decorators, { kind: "field", name: "timing", static: false, private: false, access: { has: function (obj) { return "timing" in obj; }, get: function (obj) { return obj.timing; }, set: function (obj, value) { obj.timing = value; } }, metadata: _metadata }, _timing_initializers, _timing_extraInitializers);
            __esDecorate(null, null, _sessionId_decorators, { kind: "field", name: "sessionId", static: false, private: false, access: { has: function (obj) { return "sessionId" in obj; }, get: function (obj) { return obj.sessionId; }, set: function (obj, value) { obj.sessionId = value; } }, metadata: _metadata }, _sessionId_initializers, _sessionId_extraInitializers);
            __esDecorate(null, null, _metrics_decorators, { kind: "field", name: "metrics", static: false, private: false, access: { has: function (obj) { return "metrics" in obj; }, get: function (obj) { return obj.metrics; }, set: function (obj, value) { obj.metrics = value; } }, metadata: _metadata }, _metrics_initializers, _metrics_extraInitializers);
            __esDecorate(null, null, _executionSteps_decorators, { kind: "field", name: "executionSteps", static: false, private: false, access: { has: function (obj) { return "executionSteps" in obj; }, get: function (obj) { return obj.executionSteps; }, set: function (obj, value) { obj.executionSteps = value; } }, metadata: _metadata }, _executionSteps_initializers, _executionSteps_extraInitializers);
            __esDecorate(null, null, _executionTime_decorators, { kind: "field", name: "executionTime", static: false, private: false, access: { has: function (obj) { return "executionTime" in obj; }, get: function (obj) { return obj.executionTime; }, set: function (obj, value) { obj.executionTime = value; } }, metadata: _metadata }, _executionTime_initializers, _executionTime_extraInitializers);
            __esDecorate(null, null, _result_decorators, { kind: "field", name: "result", static: false, private: false, access: { has: function (obj) { return "result" in obj; }, get: function (obj) { return obj.result; }, set: function (obj, value) { obj.result = value; } }, metadata: _metadata }, _result_initializers, _result_extraInitializers);
            __esDecorate(null, null, _error_decorators, { kind: "field", name: "error", static: false, private: false, access: { has: function (obj) { return "error" in obj; }, get: function (obj) { return obj.error; }, set: function (obj, value) { obj.error = value; } }, metadata: _metadata }, _error_initializers, _error_extraInitializers);
            __esDecorate(null, null, _timestamp_decorators, { kind: "field", name: "timestamp", static: false, private: false, access: { has: function (obj) { return "timestamp" in obj; }, get: function (obj) { return obj.timestamp; }, set: function (obj, value) { obj.timestamp = value; } }, metadata: _metadata }, _timestamp_initializers, _timestamp_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.BrowserTaskStatusDto = BrowserTaskStatusDto;
var BrowserTaskListResponseDto = function () {
    var _a;
    var _tasks_decorators;
    var _tasks_initializers = [];
    var _tasks_extraInitializers = [];
    var _total_decorators;
    var _total_initializers = [];
    var _total_extraInitializers = [];
    var _page_decorators;
    var _page_initializers = [];
    var _page_extraInitializers = [];
    var _limit_decorators;
    var _limit_initializers = [];
    var _limit_extraInitializers = [];
    var _totalPages_decorators;
    var _totalPages_initializers = [];
    var _totalPages_extraInitializers = [];
    var _hasNext_decorators;
    var _hasNext_initializers = [];
    var _hasNext_extraInitializers = [];
    var _hasPrevious_decorators;
    var _hasPrevious_initializers = [];
    var _hasPrevious_extraInitializers = [];
    return _a = /** @class */ (function () {
            function BrowserTaskListResponseDto() {
                this.tasks = __runInitializers(this, _tasks_initializers, void 0);
                this.total = (__runInitializers(this, _tasks_extraInitializers), __runInitializers(this, _total_initializers, void 0));
                this.page = (__runInitializers(this, _total_extraInitializers), __runInitializers(this, _page_initializers, void 0));
                this.limit = (__runInitializers(this, _page_extraInitializers), __runInitializers(this, _limit_initializers, void 0));
                this.totalPages = (__runInitializers(this, _limit_extraInitializers), __runInitializers(this, _totalPages_initializers, void 0));
                this.hasNext = (__runInitializers(this, _totalPages_extraInitializers), __runInitializers(this, _hasNext_initializers, void 0));
                this.hasPrevious = (__runInitializers(this, _hasNext_extraInitializers), __runInitializers(this, _hasPrevious_initializers, void 0));
                __runInitializers(this, _hasPrevious_extraInitializers);
            }
            return BrowserTaskListResponseDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _tasks_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'List of browser tasks',
                    type: [BrowserTaskResponseDto],
                })];
            _total_decorators = [(0, swagger_1.ApiProperty)({ description: 'Total number of tasks' })];
            _page_decorators = [(0, swagger_1.ApiProperty)({ description: 'Current page number' })];
            _limit_decorators = [(0, swagger_1.ApiProperty)({ description: 'Number of tasks per page' })];
            _totalPages_decorators = [(0, swagger_1.ApiProperty)({ description: 'Total number of pages' })];
            _hasNext_decorators = [(0, swagger_1.ApiProperty)({ description: 'Whether there are more pages' })];
            _hasPrevious_decorators = [(0, swagger_1.ApiProperty)({ description: 'Whether there are previous pages' })];
            __esDecorate(null, null, _tasks_decorators, { kind: "field", name: "tasks", static: false, private: false, access: { has: function (obj) { return "tasks" in obj; }, get: function (obj) { return obj.tasks; }, set: function (obj, value) { obj.tasks = value; } }, metadata: _metadata }, _tasks_initializers, _tasks_extraInitializers);
            __esDecorate(null, null, _total_decorators, { kind: "field", name: "total", static: false, private: false, access: { has: function (obj) { return "total" in obj; }, get: function (obj) { return obj.total; }, set: function (obj, value) { obj.total = value; } }, metadata: _metadata }, _total_initializers, _total_extraInitializers);
            __esDecorate(null, null, _page_decorators, { kind: "field", name: "page", static: false, private: false, access: { has: function (obj) { return "page" in obj; }, get: function (obj) { return obj.page; }, set: function (obj, value) { obj.page = value; } }, metadata: _metadata }, _page_initializers, _page_extraInitializers);
            __esDecorate(null, null, _limit_decorators, { kind: "field", name: "limit", static: false, private: false, access: { has: function (obj) { return "limit" in obj; }, get: function (obj) { return obj.limit; }, set: function (obj, value) { obj.limit = value; } }, metadata: _metadata }, _limit_initializers, _limit_extraInitializers);
            __esDecorate(null, null, _totalPages_decorators, { kind: "field", name: "totalPages", static: false, private: false, access: { has: function (obj) { return "totalPages" in obj; }, get: function (obj) { return obj.totalPages; }, set: function (obj, value) { obj.totalPages = value; } }, metadata: _metadata }, _totalPages_initializers, _totalPages_extraInitializers);
            __esDecorate(null, null, _hasNext_decorators, { kind: "field", name: "hasNext", static: false, private: false, access: { has: function (obj) { return "hasNext" in obj; }, get: function (obj) { return obj.hasNext; }, set: function (obj, value) { obj.hasNext = value; } }, metadata: _metadata }, _hasNext_initializers, _hasNext_extraInitializers);
            __esDecorate(null, null, _hasPrevious_decorators, { kind: "field", name: "hasPrevious", static: false, private: false, access: { has: function (obj) { return "hasPrevious" in obj; }, get: function (obj) { return obj.hasPrevious; }, set: function (obj, value) { obj.hasPrevious = value; } }, metadata: _metadata }, _hasPrevious_initializers, _hasPrevious_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.BrowserTaskListResponseDto = BrowserTaskListResponseDto;
