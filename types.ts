export interface ChatMessage {
  sender: string;
  timestamp: number;
  msg: string;
}

export interface ChatData {
  name: string;
  address: string;
}

export interface Friend {
  pubkey: string;
  name: string;
}

export interface User {
  accountAddress: string;
  name: string;
}
