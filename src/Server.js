require('dotenv').config();
const natural = require('natural');
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const cors = require('cors');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const os = require('os');


const app = express();
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};

app.use(cors(corsOptions));
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// MSSQL configuration
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    connectTimeout: 500000,
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Azure OpenAI configuration
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureApiKey = process.env.AZURE_API_KEY;
const deploymentId = process.env.AZURE_DEPLOYMENT_ID;
const client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));

// Connect to SQL database
sql.connect(config, (err) => {
  if (err) console.log(err);
});





// Function to get the username of the currently logged-in Windows user
function getLoggedInUsername() {
  return os.userInfo().username;
}

// console.log('Logged-in username:', getLoggedInUsername()); 
const username = getLoggedInUsername();
console.log('Username:', username);


// Function to log chats into the database
// Modified logChat function to be asynchronous
async function logChat(userQuestion, chatReply) {
	
	// Hardcoded username for testing purposes  
  const hardcodedUsername = 'test_user';  
	
  try {
    const username = getLoggedInUsername();
    console.log('Username to insert:', username);

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



app.get('/dia/api/test', async (req, res) => {
  res.send('Test');
});

// Chat endpoint
app.all('/dia/api', async (req, res) => {
  const userQuestion = req.body.question;
  let dbAnswer;

  // Check if a question is provided in the request body
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

    // Calculate similarity for the user's question
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



// Add a new endpoint for logging user interactions
// app.post('/dia/api/log', async (req, res) => {
//   const { userQuestion, chatReply } = req.body;

//   try {
//     const pool = await sql.connect(config);
//     const query = 'INSERT INTO DIA_QnA_Chatbot_Logs (UserPrompt, ChatReply, Timestamp, Username) VALUES (@userQuestion, @chatReply, GETDATE(), @Username)';
//     const result = await pool.request()
//       .input('userQuestion', sql.NVarChar, userQuestion)
//       .input('chatReply', sql.NVarChar, chatReply)
//       .input('Username', sql.NVarChar, getLoggedInUsername())
//       .query(query);

//     console.log('Logged interaction:', result);
//     res.status(200).send('Interaction logged successfully');
//   } catch (error) {
//     console.error('Error logging interaction:', error);
//     res.status(500).send('Error logging interaction');
//   }
// });



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
