Serverless Cultural exam AI Study Assistant Chat bot (AWS & RAG)

A fully serverless, Generative AI-powered web application that serves as an interactive study assistant. Users can chat with a Knowledge Base of specific textbooks and dynamically generate practice quizzes.

Live Demo: 

URL: d9fy86td1wwlq.cloudfront.net

🏗️ Architecture

This application relies on a modern, event-driven serverless architecture on AWS:

Frontend: React (using AWS Cloudscape Design System) hosted on S3 and distributed via CloudFront.

Authentication: Amazon Cognito handles secure user sign-ups, logins, and JWT token issuance.

API Layer: Amazon API Gateway securely routes frontend requests to the backend using Cognito Authorizers.

Compute: AWS Lambda (Python) processes requests, cleans LLM payloads via Regex, and communicates with AI services.

Generative AI: Amazon Bedrock orchestrated via Bedrock Agents to process natural language and generate strict JSON output.

Retrieval-Augmented Generation (RAG): Pinecone Vector Database stores document embeddings, allowing the AI to fetch relevant textbook contexts without hallucinating.

Database: Amazon DynamoDB stores session-specific chat history for conversational memory.

✨ Key Features

Document Grounded Chat: Ask complex questions about specific books, and the AI answers strictly based on the provided PDF context.

Dynamic Quiz Generation: Bypasses basic RAG constraints by utilizing a randomized seed system to force the AI to search unique document vectors, generating challenging, non-repetitive multiple-choice questions formatted in strict JSON.

Persistent Chat History: DynamoDB tracks conversation history per user, loading it seamlessly upon login.

Secure & Serverless: 100% serverless infrastructure, meaning $0 idle costs and infinitely scalable APIs.

🚀 Technical Hurdles Overcome

LLM JSON Formatting: Bedrock's underlying models occasionally injected conversational text (e.g., "Here is your quiz:") alongside JSON, breaking the frontend parser. Implemented a robust Regex sanitation layer in Lambda to extract only pure JSON objects.

RAG Redundancy: Addressed the common RAG issue of "repetitive outputs" by dynamically injecting random topic seeds into the Bedrock search query, forcing the Vector DB to traverse different geographical nodes of the document.

🛠️ Setup / Run Locally

Clone the repository.

Navigate to the frontend directory.

Run npm install to install dependencies (React, Cloudscape, AWS OIDC).

Run npm start to run the frontend locally.
(Note: Backend deployment requires setting up an AWS Bedrock Agent, API Gateway, and DynamoDB tables in your personal AWS account).