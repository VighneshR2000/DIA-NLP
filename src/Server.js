const express = require('express');
const natural = require('natural');
const bodyParser = require('body-parser');
const sql = require('mssql');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const stringSimilarity = require('string-similarity');
const tokenizer = new natural.WordTokenizer();
const cors = require('cors');
const axios = require('axios');
const app = express();
const os = require('os');

app.use(express.json());

app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

app.use(cors({
  origin: 'http://diabot.bida.equant.com:449',
  credentials: true, 
}));

//app.options('/dia/api/sug', cors());


app.use(bodyParser.json());

// MSSQL configuration
const config = {
  user: 'KBHD2348AI',
  password: 'Success@12',
  server: '10.238.115.209\\sql2016',
  database: 'IBO_Mumbai',
  options: {
    //connectTimeout: 500000, 
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Azure OpenAI config
const endpoint = 'https://obs-eu-swe-openai.openai.azure.com/';
const azureApiKey = '0a1a69fdd0e74571a6e2cff2a2f46aec';
const deploymentId = 'gpt-35-turbo-16k';
const client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));

// Connect to sql 
sql.connect(config, (err) => {
  if (err) console.log(err);
});




app.get('/dia/api/test', async (req, res) => {
  res.send('Test');
});


// Function to log chats into the database
async function logChat(userQuestion, chatReply) {
	
	// Hardcoded username for testing purposes  
  const hardcodedUsername = 'no_user';  
	
  try {
    const pool = await sql.connect(config);
    console.log('Connected to the database.');

    const query = 'INSERT INTO DIA_QnA_Chatbot_Logs (UserPrompt, ChatReply, Timestamp, Username) VALUES (@userPrompt, @chatReply, GETDATE(), @Username)';
    console.log('SQL query:', query);

    const result = await pool.request()
      .input('userPrompt', sql.NVarChar, userQuestion)
      .input('chatReply', sql.NVarChar, chatReply)
      .input('Username', sql.NVarChar, hardcodedUsername)
      .query(query);

    console.log('Result of SQL query:', result);
  } catch (error) {
    console.error('Error logging chat:', error);
  }
}




// Chat endpoint
app.all('/dia/api', async (req, res) => {
  const userQuestion = req.body.question;
  let dbAnswer;

  // Check if a question is provided body
  if (!userQuestion) {
    return res.status(400).json({ error: 'Missing question in the request body' });
  }

  try {
    const pool = await sql.connect(config);

    // Fetch all questions from DIA SQL table
    const dbQuestionsResult = await pool.request().query('SELECT Question FROM DIA_QnA_Chatbot');
    const dbQuestions = dbQuestionsResult.recordset.map((record) => record.Question);

    // Initialize TfIdf and add documents
    const tfidf = new natural.TfIdf();
    dbQuestions.forEach((question) => {
      tfidf.addDocument(question);
    });

    // Calculate similarity for the users question
    let maxSimilarity = 0;
    let mostSimilarQuestion = '';

    tfidf.tfidfs(userQuestion, function(i, measure) {
      if (measure > maxSimilarity) {
        maxSimilarity = measure;
        mostSimilarQuestion = dbQuestions[i];
      }
    });

console.log(`Most similar question: ${mostSimilarQuestion}, Score: ${maxSimilarity}`);

    
    // If a similar question was found in the database
   if (maxSimilarity > 0.5) {
      let query;
      if (userQuestion.toLowerCase().includes('link')) {
        query = 'SELECT TOP 1 Link FROM DIA_QnA_Chatbot WHERE Question = @question';
      } else if (userQuestion.toLowerCase().includes('owner')) {
        query = 'SELECT TOP 1 Owner FROM DIA_QnA_Chatbot WHERE Question = @question';
      } else {
        query = 'SELECT TOP 1 Answer FROM DIA_QnA_Chatbot WHERE Question = @question';
      }

      const result = await pool.request()
        .input('question', sql.NVarChar, mostSimilarQuestion)
        .query(query);

      console.log(result.recordset);

      // Check if the result has data and respond accordingly
      if (result.recordset.length > 0 && result.recordset[0]) {
        if (userQuestion.toLowerCase().includes('link')) {
          dbAnswer = result.recordset[0].Link || "Sorry, I couldn't find a link for that topic.";
        } else if (userQuestion.toLowerCase().includes('owner')) {
          dbAnswer = result.recordset[0].Owner || "Sorry, I couldn't find the owner for that topic.";
        } else {
          dbAnswer = result.recordset[0].Answer || "Sorry, I couldn't find an explanation for that question.";
        }
      } else {
        dbAnswer = "Sorry, I couldn't find information on that topic.";
      }

	  await logChat(userQuestion, dbAnswer); // Logging the chat
      res.type('application/json').json({ answer: dbAnswer });
    } else {
      // No similar question found, use Azure OpenAI
      const result = await client.getChatCompletions(
        deploymentId,
        [{ role: 'user', content: userQuestion }],
        { /* ...params */ }
      );

      const aiAnswer = result.choices[0].message.content;
	  await logChat(userQuestion, aiAnswer); // Logging the chat
      res.type('application/json').json({ answer: aiAnswer });
    }
  } catch (err) {
    console.error('Error in /dia/api:', err);
    res.status(500).json({ error: err.message });
  }
});




const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
