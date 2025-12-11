![Banner image](https://raw.githubusercontent.com/valyu-network/n8n-nodes-valyu/main/n8n-valyu.png)

# n8n-nodes-valyu

Use [Valyu](https://valyu.ai)'s AI-powered search, extraction, and research tools in your n8n workflows.

## Installation

1. In n8n, go to **Settings** → **Community Nodes**
2. Click **Install**
3. Enter: `n8n-nodes-valyu`
4. Click **Install**

> **Note:** Community nodes are only available on self-hosted n8n instances.

## Setup

1. Get your API key from [platform.valyu.ai](https://platform.valyu.ai) (includes $10 free credits)
2. In n8n, add a Valyu node to your workflow
3. Create new credentials with your API key

## Operations

### Search
Find information across web and premium data sources (academic papers, financial data, news).

**When to use:** Research, fact-checking, finding information on any topic.

### Extraction
Pull clean content from URLs with optional AI summarization or structured data extraction.

**When to use:** Scraping websites, getting article content, extracting specific data points.

### Answer
Get instant AI answers to questions, backed by real search results.

**When to use:** Quick Q&A, chatbots, automated responses.

### Deep Research
Run comprehensive research tasks that generate detailed reports (5-30 minutes).

**When to use:** Market research, competitive analysis, in-depth reports.

## Links

- [Documentation](https://docs.valyu.ai/integrations/n8n)
- [Valyu Platform](https://platform.valyu.ai)
- [GitHub](https://github.com/valyu-network/n8n-nodes-valyu)
- [npm](https://www.npmjs.com/package/n8n-nodes-valyu)

## Version History

### 0.2.0
- Renamed Deepsearch → Search
- Renamed Contents → Extraction
- Added Answer operation
- Added Deep Research operation
- Migrated to official Valyu SDK
- Moved parameters to expandable Options sections

### 0.1.0
- Initial release with Deepsearch and Contents operations
