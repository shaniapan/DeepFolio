import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';

// 测试语料集：涵盖开发者经常想抓取的高质量网文平台
const TEST_URLS = [
  'https://github.com/readme',
  'https://en.wikipedia.org/wiki/Deep_learning'
];

async function runUrlEvaluation() {
  console.log('🚀 开始自动化测试：网络长文 URL 抓取与解析引擎');
  
  for (const url of TEST_URLS) {
    console.log('\n===========================================');
    console.log(`📡 正在抓取: ${url}`);
    
    try {
      // 1. 调用后端的 URL 转换接口
      const res = await fetch('http://localhost:3001/api/books/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!res.ok) {
        console.error(`❌ HTTP Error: ${res.status}`);
        const errText = await res.text();
        console.error(`详情: ${errText}`);
        continue;
      }
      
      const bookinfo = await res.json();
      console.log(`✅ 入库成功:`);
      console.log(`  - DB Book ID: ${bookinfo.id}`);
      console.log(`  - 提取标题: ${bookinfo.title}`);
      
      // 2. 断言读取生成的物理 HTML 文件
      const filePath = path.join(process.cwd(), '../../data/books', bookinfo.filename);
      // fallback detection
      const actualPath = fs.existsSync(filePath) ? filePath : path.join(process.cwd(), '../../../data/books', bookinfo.filename);
      
      assert(fs.existsSync(actualPath), `找不到生成的文件 ${actualPath}`);
      
      const content = fs.readFileSync(actualPath, 'utf8');
      
      // 3. 开始硬性指标断言！
      // 必须把变量解析掉了，绝不允许出现原始 `${` 字符串
      assert(!content.includes('${title}'), '❌ 发现未解析的 ${title} 变量注入点漏洞！');
      assert(!content.includes('${article.content}'), '❌ 发现未解析的 ${article.content} 变量注入点漏洞！');
      
      // 必须包含常规的正文内容
      assert(content.includes('<html'), '缺少 HTML 骨架');
      assert(content.length > 500, '提取正文异常：文件体积太小（怀疑被放爬虫阻挡了）');
      
      console.log(`✅ 深度断言通过：HTML 文件解析完全合法 (体积: ${(content.length / 1024).toFixed(2)} KB)`);
      
    } catch (e: any) {
      console.error(`❌ 测试断言失败:`, e.message);
    }
  }
  
  console.log('\n✅ 所有的长文抓取测试集评测完成！');
}

runUrlEvaluation();
