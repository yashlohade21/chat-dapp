import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';

export const loadXMLDataset = async () => {
  const datasetPath = path.join(process.cwd(), 'dataset');
  const xmlFiles = fs.readdirSync(datasetPath).filter(file => 
    file.includes('TREC') && file.endsWith('.xml')
  );
  
  const parser = new xml2js.Parser({
    explicitArray: true,
    mergeAttrs: true,
    trim: true,
    explicitCharkey: true
  });
  
  const conversations = [];
  
  for (const file of xmlFiles) {
    console.log(`Processing XML file: ${file}`);
    const xmlContent = fs.readFileSync(path.join(datasetPath, file), 'utf8');
    try {
      const result = await parser.parseStringPromise(xmlContent);
      
      // Process TREC Questions format
      if (result && result.Questions && result.Questions['Original-Question']) {
        result.Questions['Original-Question'].forEach(question => {
          let questionText = '';
          let answerText = '';
          let categoryText = 'medical_info'; // Default category

          // Extract question text from the XML structure
          if (question._) {
            questionText = question._;
          } else if (question.Question && question.Question[0]._) {
            questionText = question.Question[0]._;
          }

          // Extract answer from summary or answer field
          if (question.Summary && question.Summary[0]._) {
            answerText = question.Summary[0]._;
          } else if (question.Answer && question.Answer[0]._) {
            answerText = question.Answer[0]._;
          }

          // Try to extract category from question type or mapping
          if (question.Type && question.Type[0]._) {
            const typeText = question.Type[0]._.toLowerCase();
            
            // Map XML types to our categories
            if (typeText.includes('treatment')) {
              categoryText = 'treatment';
            } else if (typeText.includes('diagnosis')) {
              categoryText = 'symptom_assessment';
            } else if (typeText.includes('prevention')) {
              categoryText = 'preventive_care';
            } else if (typeText.includes('recovery')) {
              categoryText = 'recovery';
            }
          }

          // Clean and validate the texts
          questionText = questionText.trim();
          answerText = answerText.trim();

          if (questionText && answerText) {
            // Add medical disclaimer if not present
            if (!answerText.toLowerCase().includes('consult') && 
                !answerText.toLowerCase().includes('healthcare provider')) {
              answerText += ' Please consult with your healthcare provider for personalized medical advice.';
            }

            conversations.push({
              question: questionText,
              answer: answerText,
              category: categoryText
            });
          }
        });
      }
    } catch(err) {
      console.error(`Error parsing file ${file}:`, err);
      continue;
    }
  }

  console.log(`Successfully processed ${conversations.length} medical Q&A pairs from XML files`);
  
  // Log sample conversations for verification
  if (conversations.length > 0) {
    console.log('\nSample Q&A pairs:');
    for (let i = 0; i < Math.min(3, conversations.length); i++) {
      console.log(`Example ${i+1}:`);
      console.log('Q:', conversations[i].question);
      console.log('A:', conversations[i].answer);
      console.log('Category:', conversations[i].category);
      console.log('---');
    }
  }
  
  return conversations;
};
