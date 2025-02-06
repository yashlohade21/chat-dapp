import React, { useContext, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ChatAppContect } from "../Context/ChatAppContext";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const { friendLists, friendMsg } = useContext(ChatAppContect);
  const [messageData, setMessageData] = useState({
    labels: [],
    datasets: []
  });

  useEffect(() => {
    // Group messages by date
    const messagesByDate = friendMsg.reduce((acc, msg) => {
      const date = new Date(msg.timestamp * 1000).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Prepare data for chart
    const data = {
      labels: Object.keys(messagesByDate),
      datasets: [
        {
          label: 'Messages per Day',
          data: Object.values(messagesByDate),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }
      ]
    };

    setMessageData(data);
  }, [friendMsg]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Chat Analytics</h1>
      <div style={{ marginTop: '20px' }}>
        <h2>Message Activity</h2>
        {messageData.labels.length > 0 ? (
          <Line 
            data={messageData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Message Activity Over Time'
                }
              }
            }}
          />
        ) : (
          <p>No message data available</p>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Quick Stats</h2>
        <p>Total Friends: {friendLists.length}</p>
        <p>Total Messages: {friendMsg.length}</p>
      </div>
    </div>
  );
};

export default Analytics;
