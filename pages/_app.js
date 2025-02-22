import "../styles/globals.css";

//INTERNAL IMPORT
import { ChatAppProvider } from "../Context/ChatAppContext";
import { NavBar } from "../Components/index";
import ChatbotGlobal from "../Components/ChatbotGlobal/ChatbotGlobal";

const MyApp = ({ Component, pageProps }) => (
  <div>
    <ChatAppProvider>
      <NavBar />
      <Component {...pageProps} />
      <ChatbotGlobal />
    </ChatAppProvider>
  </div>
);

export default MyApp;
