import React, { useEffect, useState, useRef } from "react";
import {
  IconButton,
  Paper,
  TextField,
  Typography,
  Button,
  Box,
} from "@mui/material";
import diaLogo from "./diaLogo.png";
import chatmsg from "./chatmsg.png";
import userLogo from "./userLogo.png";
import backgroundImage from "./Capture.PNG";
import { useSpring, animated } from "react-spring";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import SendIcon from "@mui/icons-material/Send";
import ClearIcon from "@mui/icons-material/Clear";
import "./NLPChatbot.css";


const Chatbot = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      message:
        "Hi, I'm DIA! I'm committed to addressing your requests on the `BIDA Data Hub` platform with my best efforts",
      sentTime: "just now",
      sender: "system",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const chatContainerRef = useRef(null);

  


  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

const handleSend = async () => {
  if (inputMessage.trim() === "") {
    return;
  }

  const userMessage = { sender: "user", message: inputMessage };
  setMessages((prevMessages) => [...prevMessages, userMessage]);
  setInputMessage("");
  setIsTyping(true);

  try {
    const response = await fetch("https://10.238.110.162/dia/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: inputMessage }),
    });

    const data = await response.json();

    if (data && data.answer) {
      const systemMessage = {
        sender: "system",
        message: data.answer,
        sentTime: "just now",
      };

      // Checking if the response is a string and a link
      const isLink =
        typeof data.answer === "string" && data.answer.startsWith("http");

      // If it's a link, wrap it in an anchor tag to make it clickable
      if (isLink) {
        systemMessage.message = (
          <div
            style={{
              width: "100%",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            <a
              href={data.answer}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block", 
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "normal", 
                wordBreak: "break-all",
              }}
            >
              Link to {data.answer.substring(0, 28)}...
            </a>
          </div>
        );
      }

      setMessages((prevMessages) => [...prevMessages, systemMessage]);
    } else {
      // Handle the case where data or data.answer is not available
      console.error("Received invalid response:", data);
    }
  } catch (err) {
    console.error("Error during sending message:", err);
  } finally {
    setIsTyping(false);
  }
};





  useEffect(() => {
    // Scroll to the bottom after each render
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  });


  const springProps = useSpring({
    transform: isChatOpen ? "translateY(0%)" : "translateY(100%)",
  });

  return (
    <div>
      <div
        style={{ position: "relative", height: "100vh", overflow: "hidden" }}
      >
        {/* Full-screen image */}
        <img
          src={backgroundImage}
          alt="Background"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: -1,
          }}
        />

        <div style={{ position: "fixed", bottom: 16, right: 16 }}>
          {!isChatOpen && (
            <IconButton
              color="primary"
              style={{
                //border: "5px solid #000",
                position: "absolute",
                bottom: 16,
                right: 16,
                borderRadius: "50%",
              }}
              onClick={toggleChat}
            >
              {/* <AdbIcon sx={{ fontSize: 40 }} /> */}
              <img
                src={diaLogo}
                alt="DIA"
                style={{
                  width: "100px",
                  borderRadius: "50%",
                  // border: "3px solid #000",
                }}
              />
            </IconButton>
          )}

          <animated.div style={springProps}>
            <Paper
              ref={chatContainerRef}
              style={{
                backgroundImage:
                  "linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)",
                position: "relative",
                width: 400,
                maxHeight: 350,
                overflowY: "auto",
                padding: 16,
                paddingTop: 60,
                borderRadius: "20px 20px 20px 20px",
                boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
                paddingBottom: "80px",
              }}
            >
              <div style={{ overflowY: "auto", flex: 1, marginTop: 8 }}>
                {messages.map((message, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        message.sender === "user" ? "flex-end" : "flex-start",
                      textAlign: "left",
                      marginBottom: 20,
                      fontSize: 15,
                      lineHeight: 1.6,
                    }}
                  >
                    {message.sender === "system" && (
                      <img
                        src={chatmsg}
                        alt="messageIcon"
                        style={{ width: "40px", marginRight: "10px" }}
                      />
                    )}

                    {message.sender === "user" && (
                      <div style={{ order: 1 }}>
                        <img
                          src={userLogo}
                          alt="messageIcon"
                          style={{
                            width: "40px",
                            marginLeft: "10px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        />
                      </div>
                    )}

                    <div
                      style={{
                        display: "inline-block",
                        padding: 10,
                        borderRadius:
                          message.sender === "user" ? "20px 20px 0 20px" : " 20px 20px 20px 0",
                        fontFamily: "'Comfortaa', sans-serif",
                        // width: "80%",
                        maxWidth: "70%",
                        fontWeight: message.sender === "user" ? "700" : "0",
                        letterSpacing:
                          message.sender === "user" ? "0.6px" : "0",
                        marginLeft: message.sender === "user" ? "30px" : "0",
                        backgroundColor:
                          message.sender === "user" ? "#F4DFBA" : "#F1EFDC ",
                        color: "black",
                        border:
                          message.sender === "user"
                            ? "1.5px solid #fcb045"
                            : "1.5px solid #fcb045",
                      }}
                    >
                      {message.message}
                    </div>
                  </div>
                ))}
              </div>

              {isTyping &&
                ({
                  /* <Typography variant="body1" style={{ textAlign: "left" }}>
                    DIA is typing...
                  </Typography> */
                },
                (
                  <div className="typing">
                    <span class="circle bouncing"></span>
                    <span class="circle bouncing"></span>
                    <span class="circle bouncing"></span>
                  </div>
                ))}

              <div
                style={{
                  height: "60px",
                  width: "96.4%",
                  paddingLeft: "10px",
                  paddingBottom: "5px",
                  display: "flex",
                  alignItems: "center",
                  marginRight: "-20px",
                  marginTop: 8,
                  marginBottom: 0,
                  position: "fixed",
                  bottom: 0,
                  left: 3,
                  // backgroundColor: "#fff",
                  backgroundImage:
                    "linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)",
                  borderRadius: "0 0 15% 15%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    width: "100%",
                    marginRight: "10px",
                    marginLeft: "10px",
                  }}
                >
                  <TextField
                    id="input-with-sx"
                    label="Chat with DIA"
                    variant="standard"
                    color="secondary"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    style={{
                      flex: 1,
                      overflow: "none",
                      width: "120%", 
                      marginRight: "10px",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        width: "100%",
                      },
                    }}
                  />
                  <Button
                    endIcon={
                      <SendIcon
                        style={{ fontSize: "25px", marginLeft: "-10px" }}
                      />
                    }
                    onClick={handleSend}
                    style={{
                      marginLeft: 8,
                      color: "black",
                      minHeight: "40px",
                      minWidth: "40px",
                    }}
                  ></Button>
                </Box>
              </div>
            </Paper>

            <div
              style={{
                width: "100%",
                height: "50px",
                // backgroundColor: "#F8F6F4",
                backgroundImage:
                  "linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)",
                position: "absolute",
                top: 0,
                left: 0,
                right: 15,
                zIndex: 1,
                borderRadius: "20px 20px 0 0",
              }}
            >
              <p style={{ textAlign: "center" }}>DIA</p>
              <div
                className="closeButton"
                style={{
                  backgroundColor: "#FFD384",

                  borderRadius: "8px",
                  position: "absolute",
                  marginRight: "10px",
                  top: 15,
                  right: 0,
                  zIndex: 1, 
                }}
              >
                <IconButton
                  className="closeButton"
                  style={{
                    width: "30px",
                    height: "20px",
                    paddingTop: "5px",
                    borderRadius: "10px",
                  }}
                  color="danger"
                  onClick={closeChat}
                >
                  <ClearIcon />
                </IconButton>
              </div>
            </div>
          </animated.div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
