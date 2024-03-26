import React from "react";
import { Routes, Route} from "react-router-dom";
import NLPChatbot from "./NLPChatbot";

function App() {
  return (
    <Routes>
      <Route path="/" element={<NLPChatbot />} />
    </Routes>
  );
}

export default App;
