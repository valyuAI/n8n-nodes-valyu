import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeApiError,
	INodeProperties,
} from 'n8n-workflow';
import { Valyu as ValyuSDK, type DeepResearchCreateOptions } from 'valyu-js';

// Helper to split comma/newline separated strings into arrays
function splitList(input?: string): string[] | undefined {
	if (!input) return undefined;
	return input
		.split(/[,\n]/)
		.map((s) => s.trim())
		.filter(Boolean);
}

// ============ SEARCH OPTIONS ============
const searchOptions: INodeProperties[] = [
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Web', value: 'web' },
			{ name: 'Proprietary', value: 'proprietary' },
			{ name: 'News', value: 'news' },
		],
		default: 'all',
		description: 'The type of sources to search',
	},
	{
		displayName: 'Max Results',
		name: 'maxNumResults',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 10,
		description: 'Maximum number of results to return',
	},
	{
		displayName: 'Response Length',
		name: 'responseLength',
		type: 'options',
		options: [
			{ name: 'Short', value: 'short' },
			{ name: 'Medium', value: 'medium' },
			{ name: 'Large', value: 'large' },
			{ name: 'Max', value: 'max' },
		],
		default: 'medium',
		description: 'Length of content returned per result',
	},
	{
		displayName: 'Max Price (CPM)',
		name: 'maxPrice',
		type: 'number',
		default: 30,
		description: 'Maximum cost per thousand characters',
	},
	{
		displayName: 'Relevance Threshold',
		name: 'relevanceThreshold',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
		default: 0.5,
		description: 'Minimum relevance score (0-1) for results',
	},
	{
		displayName: 'Fast Mode',
		name: 'fastMode',
		type: 'boolean',
		default: false,
		description: 'Whether to enable fast mode for quicker but shorter results',
	},
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'string',
		default: '',
		placeholder: 'US',
		description: 'ISO-2 country code to bias results',
	},
	{
		displayName: 'Included Sources',
		name: 'includedSources',
		type: 'string',
		default: '',
		placeholder: 'arxiv.org, valyu/valyu-arxiv',
		description: 'Comma-separated list of domains or dataset IDs to include',
	},
	{
		displayName: 'Excluded Sources',
		name: 'excludedSources',
		type: 'string',
		default: '',
		placeholder: 'reddit.com, twitter.com',
		description: 'Comma-separated list of domains to exclude',
	},
	{
		displayName: 'Category',
		name: 'category',
		type: 'string',
		default: '',
		description: 'Category filter for results',
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'string',
		default: '',
		placeholder: '2024-01-01',
		description: 'Filter results from this date (YYYY-MM-DD)',
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'string',
		default: '',
		placeholder: '2024-12-31',
		description: 'Filter results until this date (YYYY-MM-DD)',
	},
];

// ============ EXTRACTION OPTIONS ============
const extractionOptions: INodeProperties[] = [
	{
		displayName: 'Response Length',
		name: 'responseLength',
		type: 'options',
		options: [
			{ name: 'Short', value: 'short' },
			{ name: 'Medium', value: 'medium' },
			{ name: 'Large', value: 'large' },
			{ name: 'Max', value: 'max' },
		],
		default: 'medium',
		description: 'Length of extracted content per URL',
	},
	{
		displayName: 'Extract Effort',
		name: 'extractEffort',
		type: 'options',
		options: [
			{ name: 'Normal', value: 'normal' },
			{ name: 'High', value: 'high' },
			{ name: 'Auto', value: 'auto' },
		],
		default: 'normal',
		description: 'Extraction thoroughness level (auto intelligently selects)',
	},
	{
		displayName: 'Max Price ($)',
		name: 'maxPriceDollars',
		type: 'number',
		default: 1,
		description: 'Maximum cost limit in USD',
	},
];

// ============ ANSWER OPTIONS ============
const answerOptions: INodeProperties[] = [
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Web', value: 'web' },
			{ name: 'Proprietary', value: 'proprietary' },
			{ name: 'News', value: 'news' },
		],
		default: 'all',
		description: 'Type of sources to search before generating answer',
	},
	{
		displayName: 'System Instructions',
		name: 'systemInstructions',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		placeholder: 'You are a helpful assistant that provides concise, accurate answers...',
		description: 'Custom instructions for the AI (max 2000 characters)',
	},
	{
		displayName: 'Fast Mode',
		name: 'fastMode',
		type: 'boolean',
		default: false,
		description: 'Whether to enable fast mode for reduced latency',
	},
	{
		displayName: 'Data Max Price ($)',
		name: 'dataMaxPrice',
		type: 'number',
		default: 1,
		description: 'Maximum cost in USD for data retrieval',
	},
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'string',
		default: '',
		placeholder: 'US',
		description: 'ISO-2 country code to bias results',
	},
	{
		displayName: 'Included Sources',
		name: 'includedSources',
		type: 'string',
		default: '',
		placeholder: 'arxiv.org, nature.com',
		description: 'Comma-separated list of domains to include',
	},
	{
		displayName: 'Excluded Sources',
		name: 'excludedSources',
		type: 'string',
		default: '',
		placeholder: 'reddit.com',
		description: 'Comma-separated list of domains to exclude',
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'string',
		default: '',
		placeholder: '2024-01-01',
		description: 'Filter results from this date (YYYY-MM-DD)',
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'string',
		default: '',
		placeholder: '2024-12-31',
		description: 'Filter results until this date (YYYY-MM-DD)',
	},
];

// ============ DEEP RESEARCH OPTIONS ============
const deepResearchOptions: INodeProperties[] = [
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Web', value: 'web' },
			{ name: 'Proprietary', value: 'proprietary' },
		],
		default: 'all',
		description: 'Type of sources to search',
	},
	{
		displayName: 'Output Formats',
		name: 'outputFormats',
		type: 'multiOptions',
		options: [
			{ name: 'Markdown', value: 'markdown' },
			{ name: 'PDF', value: 'pdf' },
		],
		default: ['markdown'],
		description: 'Output format(s) for the research report',
	},
	{
		displayName: 'Strategy',
		name: 'strategy',
		type: 'string',
		typeOptions: { rows: 2 },
		default: '',
		placeholder: 'Focus on peer-reviewed sources. Include methodology comparisons.',
		description: 'Natural language instructions for the research strategy',
	},
	{
		displayName: 'Included Sources',
		name: 'includedSources',
		type: 'string',
		default: '',
		placeholder: 'arxiv, pubmed, nature.com',
		description: 'Comma-separated list of sources to include',
	},
	{
		displayName: 'URLs to Analyze',
		name: 'urls',
		type: 'string',
		default: '',
		placeholder: 'https://example.com/article1, https://example.com/article2',
		description: 'Comma-separated URLs to analyze (max 10)',
	},
	{
		displayName: 'Enable Code Execution',
		name: 'codeExecution',
		type: 'boolean',
		default: true,
		description: 'Whether to allow code execution during research',
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		description: 'Whether to wait for the research to complete or return immediately with task ID',
	},
];

export class Valyu implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Valyu',
		name: 'valyu',
		icon: 'file:valyu.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Search, Extract, Answer, and Deep Research with Valyu AI',
		defaults: { name: 'Valyu' },
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [{ name: 'valyuApi', required: true }],
		properties: [
			// ============ OPERATION SELECTOR ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search across web and proprietary sources',
						action: 'Search across sources',
					},
					{
						name: 'Extraction',
						value: 'extraction',
						description: 'Extract and summarize content from URLs',
						action: 'Extract content from URLs',
					},
					{
						name: 'Answer',
						value: 'answer',
						description: 'Get a fast AI answer grounded in search results',
						action: 'Get AI-powered answer',
					},
					{
						name: 'Deep Research',
						value: 'deepresearch',
						description: 'Start an async deep research task (5-30 min)',
						action: 'Start deep research task',
					},
				],
				default: 'search',
			},

			// ============ SEARCH FIELDS ============
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'What are the latest developments in quantum computing?',
				description: 'The search query',
				displayOptions: { show: { operation: ['search'] } },
			},
			{
				displayName: 'Options',
				name: 'searchOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['search'] } },
				options: searchOptions,
			},

			// ============ EXTRACTION FIELDS ============
			{
				displayName: 'URLs',
				name: 'urls',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com/article1, https://example.com/article2',
				description: 'Comma or newline-separated URLs to extract (max 10)',
				displayOptions: { show: { operation: ['extraction'] } },
			},
			{
				displayName: 'Summary Mode',
				name: 'summaryMode',
				type: 'options',
				options: [
					{ name: 'No AI Processing', value: 'none', description: 'Return raw extracted content' },
					{ name: 'Auto Summary', value: 'auto', description: 'Generate an automatic summary' },
					{ name: 'Custom Prompt', value: 'custom', description: 'Use a custom prompt for processing' },
					{ name: 'Structured Output', value: 'structured', description: 'Extract data into a JSON schema' },
				],
				default: 'none',
				description: 'How to process the extracted content',
				displayOptions: { show: { operation: ['extraction'] } },
			},
			{
				displayName: 'Custom Prompt',
				name: 'customPrompt',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'Summarize the key points and extract any mentioned dates...',
				description: 'Custom instructions for AI processing',
				displayOptions: { show: { operation: ['extraction'], summaryMode: ['custom'] } },
			},
			{
				displayName: 'JSON Schema',
				name: 'jsonSchema',
				type: 'json',
				default: '{\n  "type": "object",\n  "properties": {\n    "title": { "type": "string" },\n    "summary": { "type": "string" },\n    "key_points": { "type": "array", "items": { "type": "string" } }\n  }\n}',
				description: 'JSON Schema defining the structure for extracted data',
				displayOptions: { show: { operation: ['extraction'], summaryMode: ['structured'] } },
			},
			{
				displayName: 'Options',
				name: 'extractionOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['extraction'] } },
				options: extractionOptions,
			},

			// ============ ANSWER FIELDS ============
			{
				displayName: 'Question',
				name: 'question',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'What is the impact of AI on healthcare?',
				description: 'The question to answer',
				displayOptions: { show: { operation: ['answer'] } },
			},
			{
				displayName: 'Output Type',
				name: 'answerOutputType',
				type: 'options',
				options: [
					{ name: 'Text', value: 'text', description: 'Return a plain text answer' },
					{ name: 'Structured JSON', value: 'structured', description: 'Return answer in a JSON schema' },
				],
				default: 'text',
				description: 'Format of the answer response',
				displayOptions: { show: { operation: ['answer'] } },
			},
			{
				displayName: 'JSON Schema',
				name: 'answerSchema',
				type: 'json',
				default: '{\n  "type": "object",\n  "properties": {\n    "answer": { "type": "string", "description": "The main answer" },\n    "key_points": { "type": "array", "items": { "type": "string" } },\n    "sources_summary": { "type": "string" }\n  },\n  "required": ["answer"]\n}',
				description: 'JSON Schema for structured answer output',
				displayOptions: { show: { operation: ['answer'], answerOutputType: ['structured'] } },
			},
			{
				displayName: 'Options',
				name: 'answerOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['answer'] } },
				options: answerOptions,
			},

			// ============ DEEP RESEARCH FIELDS ============
			{
				displayName: 'Research Query',
				name: 'researchQuery',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				required: true,
				placeholder: 'Analyze the competitive landscape of cloud computing in 2024...',
				description: 'The research task description',
				displayOptions: { show: { operation: ['deepresearch'] } },
			},
			{
				displayName: 'Mode',
				name: 'researchMode',
				type: 'options',
				options: [
					{ name: 'Lite (5-10 min)', value: 'lite', description: 'Quick research, fact-checking, straightforward questions' },
					{ name: 'Heavy (15-30 min)', value: 'heavy', description: 'Complex analysis, multi-faceted topics, detailed reports' },
				],
				default: 'lite',
				description: 'Research depth and duration',
				displayOptions: { show: { operation: ['deepresearch'] } },
			},
			{
				displayName: 'Options',
				name: 'deepResearchOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['deepresearch'] } },
				options: deepResearchOptions,
			},

			// ============ OUTPUT OPTIONS ============
			{
				displayName: 'Return',
				name: 'returnMode',
				type: 'options',
				options: [
					{ name: 'Results Only', value: 'results', description: 'Return just the results array' },
					{ name: 'Full Response', value: 'full', description: 'Return the complete API response' },
				],
				default: 'results',
				displayOptions: { show: { operation: ['search', 'extraction'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const creds = await this.getCredentials('valyuApi');

			// Initialize SDK
			const valyu = new ValyuSDK(
				creds.apiKey as string,
				(creds.apiUrl as string).replace(/\/+$/, ''),
			);

			try {
				let result: any;

				// ============ SEARCH ============
				if (operation === 'search') {
					const query = this.getNodeParameter('query', i) as string;
					const options = this.getNodeParameter('searchOptions', i, {}) as Record<string, any>;

					const searchParams: Record<string, any> = {};

					if (options.searchType) searchParams.searchType = options.searchType;
					if (options.maxNumResults) searchParams.maxNumResults = options.maxNumResults;
					if (options.maxPrice) searchParams.maxPrice = options.maxPrice;
					if (options.relevanceThreshold) searchParams.relevanceThreshold = options.relevanceThreshold;
					if (options.responseLength) searchParams.responseLength = options.responseLength;
					if (options.fastMode) searchParams.fastMode = options.fastMode;
					if (options.countryCode) searchParams.countryCode = options.countryCode;
					if (options.category) searchParams.category = options.category;
					if (options.startDate) searchParams.startDate = options.startDate;
					if (options.endDate) searchParams.endDate = options.endDate;

					const includedSources = splitList(options.includedSources as string);
					const excludedSources = splitList(options.excludedSources as string);
					if (includedSources?.length) searchParams.includedSources = includedSources;
					if (excludedSources?.length) searchParams.excludeSources = excludedSources;

					result = await valyu.search(query, searchParams);

					const returnMode = this.getNodeParameter('returnMode', i) as string;
					if (returnMode === 'results' && result?.results) {
						result = result.results;
					}
				}

				// ============ EXTRACTION ============
				if (operation === 'extraction') {
					const urlsRaw = this.getNodeParameter('urls', i) as string;
					const urls = splitList(urlsRaw) || [];
					const summaryMode = this.getNodeParameter('summaryMode', i) as string;
					const options = this.getNodeParameter('extractionOptions', i, {}) as Record<string, any>;

					const extractParams: Record<string, any> = {};

					// Handle summary mode
					if (summaryMode === 'none') {
						extractParams.summary = false;
					} else if (summaryMode === 'auto') {
						extractParams.summary = true;
					} else if (summaryMode === 'custom') {
						extractParams.summary = this.getNodeParameter('customPrompt', i) as string;
					} else if (summaryMode === 'structured') {
						extractParams.summary = this.getNodeParameter('jsonSchema', i);
					}

					if (options.responseLength) extractParams.responseLength = options.responseLength;
					if (options.extractEffort) extractParams.extractEffort = options.extractEffort;
					if (options.maxPriceDollars) extractParams.maxPriceDollars = options.maxPriceDollars;

					result = await valyu.contents(urls, extractParams);

					const returnMode = this.getNodeParameter('returnMode', i) as string;
					if (returnMode === 'results' && result?.results) {
						result = result.results;
					}
				}

				// ============ ANSWER ============
				if (operation === 'answer') {
					const question = this.getNodeParameter('question', i) as string;
					const outputType = this.getNodeParameter('answerOutputType', i) as string;
					const options = this.getNodeParameter('answerOptions', i, {}) as Record<string, any>;

					const answerParams: Record<string, any> = {
						streaming: false, // Always non-streaming for n8n
					};

					if (outputType === 'structured') {
						answerParams.structuredOutput = this.getNodeParameter('answerSchema', i);
					}

					if (options.searchType) answerParams.searchType = options.searchType;
					if (options.systemInstructions) answerParams.systemInstructions = options.systemInstructions;
					if (options.fastMode) answerParams.fastMode = options.fastMode;
					if (options.dataMaxPrice) answerParams.dataMaxPrice = options.dataMaxPrice;
					if (options.countryCode) answerParams.countryCode = options.countryCode;
					if (options.startDate) answerParams.startDate = options.startDate;
					if (options.endDate) answerParams.endDate = options.endDate;

					const includedSources = splitList(options.includedSources as string);
					const excludedSources = splitList(options.excludedSources as string);
					if (includedSources?.length) answerParams.includedSources = includedSources;
					if (excludedSources?.length) answerParams.excludedSources = excludedSources;

					result = await valyu.answer(question, answerParams);
				}

				// ============ DEEP RESEARCH ============
				if (operation === 'deepresearch') {
					const input = this.getNodeParameter('researchQuery', i) as string;
					const model = this.getNodeParameter('researchMode', i) as 'lite' | 'heavy';
					const options = this.getNodeParameter('deepResearchOptions', i, {}) as Record<string, any>;

					const createParams: DeepResearchCreateOptions = {
						input,
						model,
					};

					if (options.outputFormats?.length) {
						createParams.outputFormats = options.outputFormats;
					}
					if (options.strategy) createParams.strategy = options.strategy;
					if (options.codeExecution !== undefined) createParams.codeExecution = options.codeExecution;

					// Search config
					if (options.searchType || options.includedSources) {
						createParams.search = {};
						if (options.searchType) createParams.search.searchType = options.searchType;
						const includedSources = splitList(options.includedSources as string);
						if (includedSources?.length) createParams.search.includedSources = includedSources;
					}

					// URLs to analyze
					const urls = splitList(options.urls as string);
					if (urls?.length) createParams.urls = urls;

					const taskResult = await valyu.deepresearch.create(createParams);

					if (!taskResult.success || !taskResult.deepresearch_id) {
						throw new Error(taskResult.error || 'Failed to create deep research task');
					}

					const waitForCompletion = options.waitForCompletion !== false; // Default true

					if (waitForCompletion) {
						// Wait for completion using SDK polling
						const pollInterval = model === 'lite' ? 5000 : 15000;
						const maxWaitTime = model === 'lite' ? 900000 : 2700000; // 15min for lite, 45min for heavy

						const completedResult = await valyu.deepresearch.wait(taskResult.deepresearch_id, {
							pollInterval,
							maxWaitTime,
						});

						result = {
							deepresearch_id: completedResult.deepresearch_id,
							status: completedResult.status,
							output: completedResult.output,
							output_type: completedResult.output_type,
							sources: completedResult.sources,
							usage: completedResult.usage,
							pdf_url: completedResult.pdf_url,
							completed_at: completedResult.completed_at,
						};
					} else {
						// Return immediately with task info
						result = {
							deepresearch_id: taskResult.deepresearch_id,
							status: taskResult.status || 'queued',
							model: taskResult.model || model,
							created_at: taskResult.created_at || new Date().toISOString(),
							message: 'Deep research task started. Use the deepresearch_id to check status or retrieve results later.',
						};
					}
				}

				// Convert result to array and output
				const asArray = Array.isArray(result) ? result : [result];
				out.push(...this.helpers.returnJsonArray(asArray));

			} catch (err: any) {
				if (this.continueOnFail()) {
					out.push({
						json: { error: err.message },
						pairedItem: { item: i },
					});
				} else {
					throw new NodeApiError(this.getNode(), err);
				}
			}
		}

		return [out];
	}
}
