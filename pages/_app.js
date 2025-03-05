import "../styles/globals.css";

//INTERNAL IMPORT
import { ChatAppProvider, ChatAppContect } from "../Context/ChatAppContext";
import { NavBar } from "../Components/index";
import ChatbotGlobal from "../Components/ChatbotGlobal/ChatbotGlobal";
import { useContext, useEffect, useState } from "react";

const MyApp = ({ Component, pageProps }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div>
      <ChatAppProvider>
        <NavBar />
        <Component {...pageProps} />
        {mounted && <ConditionalChatbot />}
      </ChatAppProvider>
    </div>
  );
};

// Separate component to access context
const ConditionalChatbot = () => {
  const { account } = useContext(ChatAppContect);
  
  // Only render the chatbot if the user is connected (account exists)
  if (!account) return null;
  
  return <ChatbotGlobal />;
};

export default MyApp;
