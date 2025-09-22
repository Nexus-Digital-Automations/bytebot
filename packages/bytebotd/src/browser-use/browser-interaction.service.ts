/**
 * Enhanced Browser Interaction Service with Comprehensive DOM Operations
 * Service Layer Implementation for Browser-Use API Endpoints
 */

import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

import {
  IBrowserInteraction,
  IDOMElement,
  IBrowserError,
  IPythonProcessResult,
  IServiceResponse,
} from './interfaces/browser-automation.interface';

import {
  BrowserInteractionDto,
  BrowserInteractionResponseDto,
  DOMElementDto,
  ServiceResponseDto,
  CoordinatesDto,
} from './dto/browser-automation.dto';

import { BrowserSessionService } from './browser-session.service';

@Injectable()
export class BrowserInteractionService {
  private readonly logger = new Logger(BrowserInteractionService.name);
  private readonly pythonPath: string;
  private readonly browserUsePath: string;
  private readonly enableScreenshots: boolean;
  private readonly interactionTimeout: number;

  constructor(private readonly browserSessionService: BrowserSessionService) {
    // Initialize configuration
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.browserUsePath =
      process.env.BROWSER_USE_PATH ||
      '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/browser-use';
    this.enableScreenshots = process.env.ENABLE_SCREENSHOTS !== 'false';
    this.interactionTimeout = parseInt(
      process.env.INTERACTION_TIMEOUT || '30000',
    ); // 30 seconds

    this.logger.log(
      'BrowserInteractionService initialized with comprehensive DOM operations',
    );
  }

  /**
   * Execute a click interaction on an element
   */
  async click(
    sessionId: string,
    selector: string,
    options?: { coordinates?: CoordinatesDto; timeout?: number },
  ): Promise<BrowserInteractionResponseDto> {
    const interaction: BrowserInteractionDto = {
      type: 'click',
      selector,
      coordinates: options?.coordinates,
      timeout: options?.timeout || this.interactionTimeout,
    };

    return this.executeInteraction(sessionId, interaction);
  }

  /**
   * Execute a type interaction (input text into an element)
   */
  async type(
    sessionId: string,
    selector: string,
    text: string,
    options?: { clear?: boolean; timeout?: number },
  ): Promise<BrowserInteractionResponseDto> {
    const interaction: BrowserInteractionDto = {
      type: 'type',
      selector,
      value: text,
      options: { clear: options?.clear ?? true },
      timeout: options?.timeout || this.interactionTimeout,
    };

    return this.executeInteraction(sessionId, interaction);
  }

  /**
   * Execute a select interaction (select option from dropdown)
   */
  async select(
    sessionId: string,
    selector: string,
    value: string | string[],
    options?: { timeout?: number },
  ): Promise<BrowserInteractionResponseDto> {
    const interaction: BrowserInteractionDto = {
      type: 'select',
      selector,
      value,
      timeout: options?.timeout || this.interactionTimeout,
    };

    return this.executeInteraction(sessionId, interaction);
  }

  /**
   * Execute a hover interaction
   */
  async hover(
    sessionId: string,
    selector: string,
    options?: { timeout?: number },
  ): Promise<BrowserInteractionResponseDto> {
    const interaction: BrowserInteractionDto = {
      type: 'hover',
      selector,
      timeout: options?.timeout || this.interactionTimeout,
    };

    return this.executeInteraction(sessionId, interaction);
  }

  /**
   * Execute a scroll interaction
   */
  async scroll(
    sessionId: string,
    options: {
      selector?: string;
      coordinates?: CoordinatesDto;
      direction?: 'up' | 'down' | 'left' | 'right';
      amount?: number;
      timeout?: number;
    },
  ): Promise<BrowserInteractionResponseDto> {
    const interaction: BrowserInteractionDto = {
      type: 'scroll',
      selector: options.selector,
      coordinates: options.coordinates,
      options: {
        direction: options.direction || 'down',
        amount: options.amount || 100,
      },
      timeout: options.timeout || this.interactionTimeout,
    };

    return this.executeInteraction(sessionId, interaction);
  }

  /**
   * Navigate to a URL
   */
  async navigate(
    sessionId: string,
    url: string,
    options?: { waitForLoad?: boolean; timeout?: number },
  ): Promise<BrowserInteractionResponseDto> {
    const interaction: BrowserInteractionDto = {
      type: 'navigate',
      value: url,
      options: { waitForLoad: options?.waitForLoad ?? true },
      timeout: options?.timeout || this.interactionTimeout,
    };

    return this.executeInteraction(sessionId, interaction);
  }

  /**
   * Wait for an element to appear or disappear
   */
  async wait(
    sessionId: string,
    selector: string,
    options: {
      state?: 'visible' | 'hidden' | 'attached' | 'detached';
      timeout?: number;
    },
  ): Promise<BrowserInteractionResponseDto> {
    const interaction: BrowserInteractionDto = {
      type: 'wait',
      selector,
      options: { state: options.state || 'visible' },
      timeout: options.timeout || this.interactionTimeout,
    };

    return this.executeInteraction(sessionId, interaction);
  }

  /**
   * Get element information and properties
   */
  async getElement(
    sessionId: string,
    selector: string,
  ): Promise<ServiceResponseDto<IDOMElement>> {
    try {
      this.logger.log(
        `Getting element information for selector: ${selector} in session ${sessionId}`,
      );

      const pythonScript = this.generateElementInfoScript(selector);

      const result = await this.executePythonCommand({
        command: this.pythonPath,
        args: ['-c', pythonScript],
        sessionId,
        timeout: this.interactionTimeout,
      });

      if (!result.success) {
        throw new Error(`Failed to get element info: ${result.stderr}`);
      }

      const elementData = this.parseElementResult(result.stdout);

      this.browserSessionService.updateSessionActivity(sessionId);

      return {
        success: true,
        data: elementData,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get element ${selector} in session ${sessionId}`,
        error,
      );

      return {
        success: false,
        error: this.createBrowserError(error, {
          context: { sessionId, selector },
        }),
      };
    }
  }

  /**
   * Get multiple elements matching a selector
   */
  async getElements(
    sessionId: string,
    selector: string,
  ): Promise<ServiceResponseDto<IDOMElement[]>> {
    try {
      this.logger.log(
        `Getting elements for selector: ${selector} in session ${sessionId}`,
      );

      const pythonScript = this.generateElementsInfoScript(selector);

      const result = await this.executePythonCommand({
        command: this.pythonPath,
        args: ['-c', pythonScript],
        sessionId,
        timeout: this.interactionTimeout,
      });

      if (!result.success) {
        throw new Error(`Failed to get elements info: ${result.stderr}`);
      }

      const elementsData = this.parseElementsResult(result.stdout);

      this.browserSessionService.updateSessionActivity(sessionId);

      return {
        success: true,
        data: elementsData,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get elements ${selector} in session ${sessionId}`,
        error,
      );

      return {
        success: false,
        error: this.createBrowserError(error, {
          context: { sessionId, selector },
        }),
      };
    }
  }

  /**
   * Take a screenshot of the current page or specific element
   */
  async screenshot(
    sessionId: string,
    options?: { selector?: string; fullPage?: boolean; quality?: number },
  ): Promise<ServiceResponseDto<string>> {
    try {
      this.logger.log(`Taking screenshot in session ${sessionId}`);

      const pythonScript = this.generateScreenshotScript(
        options?.selector,
        options?.fullPage,
        options?.quality,
      );

      const result = await this.executePythonCommand({
        command: this.pythonPath,
        args: ['-c', pythonScript],
        sessionId,
        timeout: this.interactionTimeout,
      });

      if (!result.success) {
        throw new Error(`Failed to take screenshot: ${result.stderr}`);
      }

      const screenshotData = this.parseScreenshotResult(result.stdout);

      this.browserSessionService.updateSessionActivity(sessionId);

      return {
        success: true,
        data: screenshotData,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to take screenshot in session ${sessionId}`,
        error,
      );

      return {
        success: false,
        error: this.createBrowserError(error, { context: { sessionId } }),
      };
    }
  }

  /**
   * Execute JavaScript code in the browser context
   */
  async executeScript(
    sessionId: string,
    script: string,
    args?: any[],
  ): Promise<ServiceResponseDto<any>> {
    try {
      this.logger.log(`Executing JavaScript in session ${sessionId}`);

      const pythonScript = this.generateJavaScriptExecutionScript(script, args);

      const result = await this.executePythonCommand({
        command: this.pythonPath,
        args: ['-c', pythonScript],
        sessionId,
        timeout: this.interactionTimeout,
      });

      if (!result.success) {
        throw new Error(`Failed to execute JavaScript: ${result.stderr}`);
      }

      const scriptResult = this.parseScriptResult(result.stdout);

      this.browserSessionService.updateSessionActivity(sessionId);

      return {
        success: true,
        data: scriptResult,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute JavaScript in session ${sessionId}`,
        error,
      );

      return {
        success: false,
        error: this.createBrowserError(error, {
          context: { sessionId, script },
        }),
      };
    }
  }

  /**
   * Get current page information (title, URL, etc.)
   */
  async getPageInfo(
    sessionId: string,
  ): Promise<
    ServiceResponseDto<{ title: string; url: string; html?: string }>
  > {
    try {
      this.logger.log(`Getting page info for session ${sessionId}`);

      const pythonScript = this.generatePageInfoScript();

      const result = await this.executePythonCommand({
        command: this.pythonPath,
        args: ['-c', pythonScript],
        sessionId,
        timeout: this.interactionTimeout,
      });

      if (!result.success) {
        throw new Error(`Failed to get page info: ${result.stderr}`);
      }

      const pageInfo = this.parsePageInfoResult(result.stdout);

      this.browserSessionService.updateSessionActivity(sessionId);

      return {
        success: true,
        data: pageInfo,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get page info in session ${sessionId}`,
        error,
      );

      return {
        success: false,
        error: this.createBrowserError(error, { context: { sessionId } }),
      };
    }
  }

  /**
   * Execute a browser interaction through Python browser-use framework
   */
  private async executeInteraction(
    sessionId: string,
    interaction: BrowserInteractionDto,
  ): Promise<BrowserInteractionResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Executing ${interaction.type} interaction for session ${sessionId}`,
      );

      const pythonScript = this.generateInteractionScript(interaction);

      const result = await this.executePythonCommand({
        command: this.pythonPath,
        args: ['-c', pythonScript],
        sessionId,
        timeout: interaction.timeout || this.interactionTimeout,
      });

      if (!result.success) {
        throw new Error(`Interaction failed: ${result.stderr}`);
      }

      const duration = Date.now() - startTime;
      const responseData = this.parseInteractionResult(result.stdout);

      // Record task completion in session service
      this.browserSessionService.recordTaskCompletion(
        sessionId,
        duration,
        true,
      );

      this.logger.log(
        `Interaction ${interaction.type} completed in ${duration}ms`,
      );

      return {
        success: true,
        data: responseData,
        screenshot: responseData.screenshot,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record task failure in session service
      this.browserSessionService.recordTaskCompletion(
        sessionId,
        duration,
        false,
      );

      const browserError = this.createBrowserError(error, {
        context: {
          sessionId,
          interaction: interaction.type,
          selector: interaction.selector,
        },
      });

      this.logger.error(
        `Interaction ${interaction.type} failed after ${duration}ms`,
        error,
      );

      return {
        success: false,
        error: browserError,
      };
    }
  }

  /**
   * Generate Python script for browser interaction
   */
  private generateInteractionScript(
    interaction: BrowserInteractionDto,
  ): string {
    const baseScript = `
import asyncio
import json
import base64
from browser_use import Agent

async def execute_interaction():
    agent = Agent(
        task="Execute ${interaction.type} interaction",
        llm="anthropic/claude-3-5-sonnet-20241022"
    )

    try:
        result = None

        if "${interaction.type}" == "click":
            ${
              interaction.coordinates
                ? `result = await agent.browser.page.click(${interaction.coordinates.x}, ${interaction.coordinates.y})`
                : `result = await agent.browser.click("${interaction.selector || ''}")`
            }
        elif "${interaction.type}" == "type":
            ${interaction.options?.clear ? `await agent.browser.page.fill("${interaction.selector || ''}", "")` : ''}
            result = await agent.browser.type("${interaction.selector || ''}", "${interaction.value || ''}")
        elif "${interaction.type}" == "select":
            result = await agent.browser.page.select_option("${interaction.selector || ''}", "${interaction.value || ''}")
        elif "${interaction.type}" == "hover":
            result = await agent.browser.page.hover("${interaction.selector || ''}")
        elif "${interaction.type}" == "scroll":
            ${
              interaction.selector
                ? `element = await agent.browser.page.query_selector("${interaction.selector}")
               result = await element.scroll_into_view_if_needed()`
                : `result = await agent.browser.page.evaluate('''() => {
                 window.scrollBy(${interaction.coordinates?.x || 0}, ${interaction.coordinates?.y || interaction.options?.amount || 100});
               }''')`
            }
        elif "${interaction.type}" == "navigate":
            result = await agent.browser.goto("${interaction.value || ''}")
            ${interaction.options?.waitForLoad ? 'await agent.browser.page.wait_for_load_state("networkidle")' : ''}
        elif "${interaction.type}" == "wait":
            if "${interaction.options?.state || 'visible'}" == "visible":
                result = await agent.browser.page.wait_for_selector("${interaction.selector || ''}", state="visible")
            elif "${interaction.options?.state}" == "hidden":
                result = await agent.browser.page.wait_for_selector("${interaction.selector || ''}", state="hidden")
            else:
                result = await agent.browser.page.wait_for_selector("${interaction.selector || ''}")

        # Take screenshot if enabled
        screenshot = None
        if ${this.enableScreenshots}:
            screenshot_data = await agent.browser.screenshot()
            if screenshot_data:
                screenshot = base64.b64encode(screenshot_data).decode('utf-8')

        output = {
            "success": True,
            "result": str(result) if result else "Interaction completed",
            "screenshot": screenshot,
            "interaction_type": "${interaction.type}"
        }
        print(json.dumps(output))

    except Exception as e:
        output = {
            "success": False,
            "error": str(e),
            "interaction_type": "${interaction.type}"
        }
        print(json.dumps(output))

if __name__ == "__main__":
    asyncio.run(execute_interaction())
`;
    return baseScript;
  }

  /**
   * Generate Python script for element information retrieval
   */
  private generateElementInfoScript(selector: string): string {
    return `
import asyncio
import json
from browser_use import Agent

async def get_element_info():
    agent = Agent(task="Get element info", llm="anthropic/claude-3-5-sonnet-20241022")

    try:
        element = await agent.browser.page.query_selector("${selector}")

        if not element:
            raise Exception("Element not found")

        # Get element properties
        tag_name = await element.evaluate("el => el.tagName.toLowerCase()")
        text_content = await element.text_content() or ""
        value = await element.get_attribute("value") or ""

        # Get all attributes
        attributes = await element.evaluate('''el => {
            const attrs = {};
            for (let attr of el.attributes) {
                attrs[attr.name] = attr.value;
            }
            return attrs;
        }''')

        # Get bounding box
        bounding_box = await element.bounding_box()

        # Check visibility and enabled state
        visible = await element.is_visible()
        enabled = await element.is_enabled()

        element_info = {
            "selector": "${selector}",
            "tagName": tag_name,
            "text": text_content,
            "value": value,
            "attributes": attributes,
            "boundingBox": bounding_box,
            "visible": visible,
            "enabled": enabled
        }

        print(json.dumps(element_info))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    asyncio.run(get_element_info())
`;
  }

  /**
   * Generate Python script for multiple elements information retrieval
   */
  private generateElementsInfoScript(selector: string): string {
    return `
import asyncio
import json
from browser_use import Agent

async def get_elements_info():
    agent = Agent(task="Get elements info", llm="anthropic/claude-3-5-sonnet-20241022")

    try:
        elements = await agent.browser.page.query_selector_all("${selector}")

        elements_info = []

        for i, element in enumerate(elements):
            # Get element properties
            tag_name = await element.evaluate("el => el.tagName.toLowerCase()")
            text_content = await element.text_content() or ""
            value = await element.get_attribute("value") or ""

            # Get all attributes
            attributes = await element.evaluate('''el => {
                const attrs = {};
                for (let attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                }
                return attrs;
            }''')

            # Get bounding box
            bounding_box = await element.bounding_box()

            # Check visibility and enabled state
            visible = await element.is_visible()
            enabled = await element.is_enabled()

            element_info = {
                "selector": "${selector}:nth-child(" + str(i + 1) + ")",
                "tagName": tag_name,
                "text": text_content,
                "value": value,
                "attributes": attributes,
                "boundingBox": bounding_box,
                "visible": visible,
                "enabled": enabled
            }

            elements_info.append(element_info)

        print(json.dumps(elements_info))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    asyncio.run(get_elements_info())
`;
  }

  /**
   * Generate Python script for screenshot capture
   */
  private generateScreenshotScript(
    selector?: string,
    fullPage?: boolean,
    quality?: number,
  ): string {
    return `
import asyncio
import json
import base64
from browser_use import Agent

async def take_screenshot():
    agent = Agent(task="Take screenshot", llm="anthropic/claude-3-5-sonnet-20241022")

    try:
        screenshot_options = {
            "full_page": ${fullPage || false},
            "quality": ${quality || 80}
        }

        ${
          selector
            ? `element = await agent.browser.page.query_selector("${selector}")
           if element:
               screenshot_data = await element.screenshot(**screenshot_options)
           else:
               raise Exception("Element not found for screenshot")`
            : `screenshot_data = await agent.browser.page.screenshot(**screenshot_options)`
        }

        # Encode to base64
        screenshot_base64 = base64.b64encode(screenshot_data).decode('utf-8')

        print(json.dumps({"screenshot": screenshot_base64}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    asyncio.run(take_screenshot())
`;
  }

  /**
   * Generate Python script for JavaScript execution
   */
  private generateJavaScriptExecutionScript(
    script: string,
    args?: any[],
  ): string {
    const argsJson = JSON.stringify(args || []);

    return `
import asyncio
import json
from browser_use import Agent

async def execute_javascript():
    agent = Agent(task="Execute JavaScript", llm="anthropic/claude-3-5-sonnet-20241022")

    try:
        script = """${script.replace(/"/g, '\\"')}"""
        args = ${argsJson}

        if args:
            result = await agent.browser.page.evaluate(script, *args)
        else:
            result = await agent.browser.page.evaluate(script)

        print(json.dumps({"result": result}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    asyncio.run(execute_javascript())
`;
  }

  /**
   * Generate Python script for page information retrieval
   */
  private generatePageInfoScript(): string {
    return `
import asyncio
import json
from browser_use import Agent

async def get_page_info():
    agent = Agent(task="Get page info", llm="anthropic/claude-3-5-sonnet-20241022")

    try:
        title = await agent.browser.page.title()
        url = agent.browser.page.url
        html = await agent.browser.page.content()

        page_info = {
            "title": title,
            "url": url,
            "html": html[:1000] + "..." if len(html) > 1000 else html  # Truncate HTML for response size
        }

        print(json.dumps(page_info))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    asyncio.run(get_page_info())
`;
  }

  /**
   * Execute Python command with browser-use framework
   */
  private async executePythonCommand(command: {
    command: string;
    args: string[];
    sessionId: string;
    timeout: number;
  }): Promise<IPythonProcessResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const process = spawn(command.command, command.args, {
        cwd: this.browserUsePath,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        resolve({
          success: false,
          stderr: 'Process timeout',
          duration: Date.now() - startTime,
          pid: process.pid,
        });
      }, command.timeout);

      process.on('close', (exitCode) => {
        clearTimeout(timeout);

        resolve({
          success: exitCode === 0,
          stdout,
          stderr,
          exitCode: exitCode || undefined,
          duration: Date.now() - startTime,
          pid: process.pid,
        });
      });
    });
  }

  /**
   * Parse interaction result from Python output
   */
  private parseInteractionResult(stdout: string): any {
    try {
      return JSON.parse(stdout.trim());
    } catch {
      return { result: stdout };
    }
  }

  /**
   * Parse element result from Python output
   */
  private parseElementResult(stdout: string): IDOMElement {
    try {
      const parsed = JSON.parse(stdout.trim());
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed as IDOMElement;
    } catch (error) {
      throw new Error(`Failed to parse element result: ${error.message}`);
    }
  }

  /**
   * Parse elements result from Python output
   */
  private parseElementsResult(stdout: string): IDOMElement[] {
    try {
      const parsed = JSON.parse(stdout.trim());
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed as IDOMElement[];
    } catch (error) {
      throw new Error(`Failed to parse elements result: ${error.message}`);
    }
  }

  /**
   * Parse screenshot result from Python output
   */
  private parseScreenshotResult(stdout: string): string {
    try {
      const parsed = JSON.parse(stdout.trim());
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed.screenshot;
    } catch (error) {
      throw new Error(`Failed to parse screenshot result: ${error.message}`);
    }
  }

  /**
   * Parse script execution result from Python output
   */
  private parseScriptResult(stdout: string): any {
    try {
      const parsed = JSON.parse(stdout.trim());
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed.result;
    } catch (error) {
      throw new Error(`Failed to parse script result: ${error.message}`);
    }
  }

  /**
   * Parse page info result from Python output
   */
  private parsePageInfoResult(stdout: string): {
    title: string;
    url: string;
    html?: string;
  } {
    try {
      const parsed = JSON.parse(stdout.trim());
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse page info result: ${error.message}`);
    }
  }

  /**
   * Create standardized browser error
   */
  private createBrowserError(
    error: any,
    options: {
      context?: any;
      severity?: 'info' | 'warning' | 'error' | 'critical';
    } = {},
  ): IBrowserError {
    return {
      code: error.code || 'INTERACTION_ERROR',
      message: error.message || 'Unknown interaction error',
      stack: error.stack,
      context: options.context,
      timestamp: new Date(),
      severity: options.severity || 'error',
    };
  }
}
