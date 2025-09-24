import OpenAI from 'openai'
import { createLogger } from '@/lib/logs/console/logger'
import { env } from '@/lib/env'
import type { StreamingExecution } from '@/executor/types'
import type {
  ProviderConfig,
  ProviderRequest,
  ProviderResponse,
  TimeSegment,
} from '@/providers/types'
import {
  prepareToolExecution,
  prepareToolsWithUsageControl,
  trackForcedToolUsage,
} from '@/providers/utils'
import { executeTool } from '@/tools'

const logger = createLogger('GatewayzProvider')

/**
 * Helper function to convert an OpenAI stream to a standard ReadableStream
 * and collect completion metrics
 */
function createReadableStreamFromOpenAIStream(
  openaiStream: any,
  onComplete?: (content: string, usage?: any) => void
): ReadableStream {
  let fullContent = ''
  let usageData: any = null

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of openaiStream) {
          // Check for usage data in the final chunk
          if (chunk.usage) {
            usageData = chunk.usage
          }

          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            fullContent += content
            controller.enqueue(new TextEncoder().encode(content))
          }
        }

        // Once stream is complete, call the completion callback with the final content and usage
        if (onComplete) {
          onComplete(fullContent, usageData)
        }

        controller.close()
      } catch (error) {
        logger.error('Error in Gatewayz stream:', error)
        controller.error(error)
      }
    },
  })
}

/**
 * Gatewayz.ai provider implementation using OpenAI-compatible API
 */
export const gatewayzProvider: ProviderConfig = {
  id: 'gatewayz',
  name: 'Gatewayz',
  description: 'Unified inference gateway for multiple AI models',
  version: '1.0.0',
  models: [], // Will be populated dynamically
  defaultModel: '', // Will be determined by the gateway

  executeRequest: async (request: ProviderRequest): Promise<ProviderResponse | StreamingExecution> => {
    logger.info('Preparing Gatewayz request', {
      model: request.model,
      hasSystemPrompt: !!request.systemPrompt,
      hasMessages: !!request.messages?.length,
      hasTools: !!request.tools?.length,
      toolCount: request.tools?.length || 0,
      stream: !!request.stream,
    })

    if (!env.GATEWAYZ_API_KEY || !env.GATEWAYZ_BASE_URL) {
      throw new Error('GATEWAYZ_API_KEY and GATEWAYZ_BASE_URL are required')
    }

    const client = new OpenAI({
      apiKey: env.GATEWAYZ_API_KEY,
      baseURL: env.GATEWAYZ_BASE_URL,
    })

    // Start with an empty array for all messages
    const allMessages = []

    // Add system prompt if present
    if (request.systemPrompt) {
      allMessages.push({
        role: 'system',
        content: request.systemPrompt,
      })
    }

    // Add context if present
    if (request.context) {
      allMessages.push({
        role: 'user',
        content: request.context,
      })
    }

    // Add existing messages if present
    if (request.messages && request.messages.length > 0) {
      allMessages.push(...request.messages)
    }

    // Stream handling
    if (request.stream) {
      return {
        stream: await executeStreamingRequest(client, request, allMessages),
        execution: request as StreamingExecution,
      }
    }

    // Non-streaming request
    return executeNonStreamingRequest(client, request, allMessages)
  },
}

async function executeNonStreamingRequest(
  client: OpenAI,
  request: ProviderRequest,
  allMessages: any[]
): Promise<ProviderResponse> {
  try {
    // Prepare tools if they exist
    const { tools, toolChoice, forcedTools } = await prepareToolsWithUsageControl(
      request.tools || [],
      request.tools, // Pass original tools as providerTools
      logger
    )

    const completion = await client.chat.completions.create({
      model: request.model,
      messages: allMessages as any,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      tools: tools && tools.length > 0 ? tools : undefined,
      tool_choice: toolChoice,
      stream: false,
    })

    const message = completion.choices[0]?.message
    if (!message) {
      throw new Error('No response from Gatewayz')
    }

    // Handle tool calls
    if (message.tool_calls?.length) {
      const toolResults = []
      for (const toolCall of message.tool_calls) {
        try {
          const { toolParams, executionParams } = prepareToolExecution(
            { params: {} },
            JSON.parse(toolCall.function.arguments),
            request
          )
          const result = await executeTool(toolCall, executionParams)
          toolResults.push(result)
        } catch (error) {
          logger.error('Tool execution failed:', error)
          toolResults.push({
            role: 'tool' as const,
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            tool_call_id: toolCall.id,
          })
        }
      }

      return {
        content: message.content || '',
        model: request.model,
        toolCalls: message.tool_calls.map(tc => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        toolResults,
        tokens: {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        },
      }
    }

    return {
      content: message.content || '',
      model: request.model,
      tokens: {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0,
      },
    }
  } catch (error) {
    logger.error('Gatewayz request failed:', error)
    throw error
  }
}

async function executeStreamingRequest(
  client: OpenAI,
  request: ProviderRequest,
  allMessages: any[]
): Promise<ReadableStream> {
  try {
    // Prepare tools if they exist
    const { tools, toolChoice } = await prepareToolsWithUsageControl(
      request.tools || [],
      request.tools, // Pass original tools as providerTools
      logger
    )

    const stream = await client.chat.completions.create({
      model: request.model,
      messages: allMessages as any,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      tools: tools && tools.length > 0 ? tools : undefined,
      tool_choice: toolChoice,
      stream: true,
    })

    return createReadableStreamFromOpenAIStream(stream)
  } catch (error) {
    logger.error('Gatewayz stream failed:', error)
    throw error
  }
}