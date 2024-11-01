/**
 * Copyright 2024 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { join } from 'path';

import { BaseToolOptions, StringToolOutput, Tool, ToolError } from '@/tools/base.js';
import { SchemaObject } from 'ajv';
import { parse } from 'yaml';
import { isEmpty } from 'remeda';
import axios from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';


export interface ApiCallToolOptions extends BaseToolOptions {
  name: string;
  description?: string;
  openApiSchema?: any;
  apiKey?: string;
  http_proxy_url?: string;
}

export class ApiCallTool extends Tool<StringToolOutput, ApiCallToolOptions> {
  name: string;
  description: string;
  openApiSchema: any;
  apiKey?: string;
  http_proxy_url?: string;

  inputSchema() {
    return {
      type: 'object',
      required: ['path', 'method'],
      oneOf: Object.entries(this.openApiSchema.paths).flatMap(([path, pathSpec]: [string, any]) =>
        Object.entries(pathSpec).map(([method, methodSpec]: [string, any]) => ({
          additionalProperties: false,
          properties: {
            path: {
              const: path,
              description:
                'Do not replace variables in path, instead of, put them to the parameters object.'
            },
            method: { const: method, description: methodSpec.summary || methodSpec.description },
            ...(methodSpec.requestBody?.content?.['application/json']?.schema
              ? {
                  body: methodSpec.requestBody?.content?.['application/json']?.schema
                }
              : {}),
            ...(methodSpec.parameters
              ? {
                  parameters: {
                    type: 'object',
                    additionalProperties: false,
                    required: methodSpec.parameters
                      .filter((p: any) => p.required === true)
                      .map((p: any) => p.name),
                    properties: methodSpec.parameters.reduce(
                      (acc: any, p: any) => ({
                        ...acc,
                        [p.name]: { ...p.schema, description: p.name }
                      }),
                      {}
                    )
                  }
                }
              : {})
          }
        }))
      )
    } as const satisfies SchemaObject;
  }

  public constructor({ name, description, openApiSchema, apiKey, http_proxy_url, ...rest }: ApiCallToolOptions) {
    super({ name, description, ...rest });
    this.name = name;
    this.apiKey = apiKey;
    this.http_proxy_url = http_proxy_url;
    this.description = description ?? 'Use input schema to infer description';
    this.openApiSchema = parse(openApiSchema);
    // TODO: #105 review error codes. Were using APIErrorCode, now ToolError
    if (!this.openApiSchema?.paths) {
      throw new ToolError("Server is not specified!")
    }
  }

  protected async _run(input: any) {
    let path: string = input.path || '';
    const url = new URL(this.openApiSchema.servers[0].url);
    Object.keys(input.parameters ?? {}).forEach((key) => {
      if (path.search(`{${key}}`) >= 0) {
        path = path.replace(`{${key}}`, input.parameters[key]);
      } else {
        url.searchParams.append(key, input.parameters[key]);
      }
    });
    url.pathname = join(url.pathname, path);
    const headers: { [key: string]: string } = { Accept: 'application/json' };
    if (this.apiKey) {
      //TODO: #105 confirm ok to remove use of encrypted api key
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    try {
      const response = await axios.request({
        url: url.toString(),
        data: !isEmpty(input.body) ? input.body : undefined,
        method: input.method.toLowerCase(),
        headers,
        transformResponse: [(data) => data],
        httpsAgent: this.http_proxy_url && new HttpsProxyAgent(this.http_proxy_url),
        httpAgent: this.http_proxy_url && new HttpProxyAgent(this.http_proxy_url),
        signal: AbortSignal.timeout(30_000)
      });
      return new StringToolOutput(response.data);
    } catch (error) {
      throw new ToolError(`Request to ${url} failed.`);
    }
  }
}
