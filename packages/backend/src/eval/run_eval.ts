import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callAI, type AICallParams, type AIModel } from '../services/ai/adapter.js';
import { db } from '../db/index.js';

// 获取数据库存的设置
const settingsRows = db.prepare('SELECT key, value FROM settings').all() as {key: string, value: string}[];
const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

const activeModel = (settings.active_model || 'qwen') as AIModel;
const apiKey = (settings[`api_key_${activeModel}`] || process.env[`${activeModel.toUpperCase()}_API_KEY`]) as string;

if (!apiKey) {
  console.error(`Missing API Key for model ${activeModel}. Run this with ${activeModel.toUpperCase()}_API_KEY env or configure it in DB.`);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.resolve(__dirname, 'dataset.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

async function runEval() {
  console.log(`🚀 Starting AI Eval Strategy: Model=[${activeModel}]`);
  
  let passed = 0;
  
  for (const item of dataset) {
    console.log(`\n---------------------------------`);
    console.log(`🧐 Evaluating ID: ${item.id} | Task: ${item.task}`);
    
    const systemPrompt = `You are a strict reading assistant. Task: ${item.task}. Respond strictly in JSON. Context: ${item.context || 'None'}`;
    const userPrompt = `Passage:\n"${item.input}"\n\nGenerate the expected JSON output based on your reading assistant persona.`;

    try {
      const responseText = await callAI({
        model: activeModel,
        apiKey,
        systemPrompt,
        userPrompt,
        jsonMode: true
      });

      console.log(`🤖 Output Payload: ${responseText.slice(0, 150)}...`);
      
      let pass = true;
      let failureReason = '';
      
      const resData = JSON.parse(responseText);
      
      // Hard Assertion Match logic
      if (item.expected.type && resData.type !== item.expected.type) {
        pass = false;
        failureReason += `Type mismatch (exp: ${item.expected.type}, got: ${resData.type}). `;
      }
      
      const reqKeys = item.expected.requiredConcepts || item.expected.requiredKeyPoints || [];
      const resStr = responseText.toLowerCase();
      const missed = reqKeys.filter((k: string) => !resStr.includes(k.toLowerCase()));
      
      if (missed.length > 0) {
        pass = false;
        failureReason += `Missed concepts: ${missed.join(', ')}. `;
      }

      if (pass) {
        console.log('✅ Pass');
        passed++;
      } else {
        console.log(`❌ Fail: ${failureReason}`);
      }

    } catch (e: any) {
      console.log(`❌ Error executing eval: ${e.message}`);
    }
  }

  console.log(`\n=================================`);
  console.log(`🏅 Eval Score: ${passed} / ${dataset.length} (${(passed / dataset.length * 100).toFixed(0)}%)`);
  console.log(`=================================`);
}

runEval();
