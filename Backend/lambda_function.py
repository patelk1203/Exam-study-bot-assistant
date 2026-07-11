import json
import boto3
import logging
import random
import re
from datetime import datetime
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

agent_client = boto3.client('bedrock-agent-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
chat_table = dynamodb.Table('SatsangChatHistory')

BEDROCK_AGENT_ID = "YOUR_AGENT_ID"
BEDROCK_AGENT_ALIAS_ID = "YOUR_AGENT_ALIAS_ID"

def clean_llm_json(text):
    """Strips Markdown backticks and conversational filler to extract raw JSON."""
    text = text.strip()
    
    # Strip markdown code block wrappers if they exist (using `{3}` to avoid parser bugs)
    text = re.sub(r'^`{3}(?:json)?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'`{3}\s*$', '', text, flags=re.MULTILINE)
    
    # Find the first '{' and last '}'
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        return text[start:end+1]
        
    return text

def lambda_handler(event, context):
    try:
        user_email = event['requestContext']['authorizer']['jwt']['claims']['email']
    except KeyError:
        try:
            user_email = event['requestContext']['authorizer']['claims']['email']
        except KeyError:
            user_email = "anonymous_session"

    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'chat')
        book = body.get('book', 'General Knowledge')
        user_message = body.get('message', 'Generate a practice quiz.')
    except Exception:
        return {"statusCode": 400, "body": json.dumps({"message": "Invalid payload"})}

    # FETCH CONVERSATION HISTORY
    if action == "get_history":
        try:
            response = chat_table.query(
                KeyConditionExpression=Key('user_email').eq(user_email)
            )
            history_data = []
            # Sort chronologically by timestamp
            items = sorted(response.get('Items', []), key=lambda x: x['timestamp'])
            for item in items:
                history_data.append({"sender": "user", "text": item['user_message']})
                history_data.append({"sender": "bot", "text": item['ai_response']})
            
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': 'https://d9fy86td1wwlq.cloudfront.net'},
                'body': json.dumps({"history": history_data})
            }
        except Exception as e:
            logger.error(f"DynamoDB Read Error: {e}")
            return {"statusCode": 500, "body": json.dumps({"history": []})}

    logger.info(f"AUDIT LOG | User: {user_email} | Action: {action} | Context: {book} | Message: {user_message}")

    random_seed = random.randint(1, 999999)

    if action == "generate_quiz":
        formatted_prompt = (
            f"Book Context: {book}\n"
            f"Task: Generate a 3-question multiple-choice practice quiz using ONLY your Knowledge Base.\n"
            f"Random Seed for Variety: {random_seed} (Use this to select completely random and obscure chapters/events from the book to avoid repeating questions).\n\n"
            f"<formatting_rules>\n"
            f"1. You MUST output YOUR ENTIRE RESPONSE as a single, valid JSON object.\n"
            f"2. DO NOT output any conversational text. DO NOT start with 'Question 1:'. DO NOT say 'Here is the quiz'. Output ONLY JSON.\n"
            f"3. The 'correct' answer string MUST exactly match one of the strings in the 'options' array.\n"
            f"4. Use this exact JSON schema:\n"
            f"{{\n"
            f"  \"questions\": [\n"
            f"    {{\n"
            f"      \"question\": \"The question text\",\n"
            f"      \"options\": [\"Option 1\", \"Option 2\", \"Option 3\", \"Option 4\"],\n"
            f"      \"correct\": \"Option 1\",\n"
            f"      \"explanation\": \"Why this is correct\"\n"
            f"    }}\n"
            f"  ]\n"
            f"}}\n"
            f"</formatting_rules>\n\n"
            f"If the Knowledge Base fails, output ONLY the exact phrase: INDEXING_ERROR."
        )
    else:
        formatted_prompt = f"[{action.upper()}] Book Context: {book} | User Input: {user_message}"
    
    # Use a fresh, empty session for quizzes so it generates instantly without reading past chats
    if action == "generate_quiz":
        safe_session_id = f"quiz-{random_seed}-{random.randint(1, 9999)}"
    else:
        safe_session_id = "".join(c if c.isalnum() else '-' for c in user_email)[:50]

    try:
        response = agent_client.invoke_agent(
            agentId=BEDROCK_AGENT_ID,
            agentAliasId=BEDROCK_AGENT_ALIAS_ID,
            sessionId=safe_session_id,  
            inputText=formatted_prompt
        )

        agent_response_text = ""
        for event_stream in response.get('completion'):
            if 'chunk' in event_stream:
                agent_response_text += event_stream['chunk']['bytes'].decode('utf-8')

        if action == "generate_quiz":
            if "INDEXING_ERROR" in agent_response_text or "building the quiz index" in agent_response_text or "Retry Quiz Generation" in agent_response_text:
                final_payload = {"error": "The study material for this book is currently syncing or temporarily unavailable. Please wait a few moments and try again."}
            else:
                cleaned_json_text = clean_llm_json(agent_response_text)
                try:
                    final_payload = json.loads(cleaned_json_text)
                except json.JSONDecodeError as e:
                    logger.error(f"Raw AI Output that failed JSON parsing: {agent_response_text}")
                    # Return a snippet of the raw AI text to the frontend so we can see why it broke!
                    snippet = agent_response_text[:150].replace('\n', ' ')
                    final_payload = {"error": f"The AI returned an invalid format. AI Output: '{snippet}...'"}
        else:
            final_payload = {"answer": agent_response_text}
            
            # SAVE CHAT MESSAGES TO DYNAMODB
            try:
                timestamp = datetime.utcnow().isoformat()
                chat_table.put_item(
                    Item={
                        'user_email': user_email,
                        'timestamp': timestamp,
                        'user_message': user_message,
                        'ai_response': agent_response_text
                    }
                )
            except Exception as e:
                logger.error(f"DynamoDB Write Error: {str(e)}")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': 'https://d9fy86td1wwlq.cloudfront.net',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps(final_payload)
        }

    except Exception as e:
        logger.error(f"Failed to invoke Agent: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': 'https://d9fy86td1wwlq.cloudfront.net'},
            'body': json.dumps({"error": "Backend error connecting to the AI. Please wait a moment and try again."})
        }