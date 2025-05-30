import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Modal, TextInput, Button } from 'react-native';

export default function App() {
  const [receivedOrders, setReceivedOrders] = useState([]);
  const [socket, setSocket] = useState(null);
  const [serverIp, setServerIp] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(true);

  const connectToServer = () => {
    const socketUrl = `ws://${serverIp}:8090`;
    const socketConnection = new WebSocket(socketUrl);

    socketConnection.onopen = () => {
      console.log('WebSocket connection established');
      setIsModalVisible(false); // Close the modal only on successful connection
    };

    socketConnection.onmessage = (event) => {
      let messageData = event.data;

      // Check if the data is an ArrayBuffer and decode it
      if (messageData instanceof ArrayBuffer) {
        const decoder = new TextDecoder('utf-8');
        messageData = decoder.decode(messageData);
      }

      console.log('Received message: ', messageData);

      try {
        // Ensure the message is valid JSON before parsing
        if (typeof messageData === 'string' && messageData.trim().startsWith('{') && messageData.trim().endsWith('}')) {
          const parsedData = JSON.parse(messageData);

          // Ignore messages forwarded to cozinha
          if (!parsedData.forwardedToCozinha) {
            setReceivedOrders((prevOrders) => [...prevOrders, parsedData]);
          }
        } else {
          console.warn('Received non-JSON message: ', messageData);
        }
      } catch (error) {
        console.error('Error parsing JSON: ', error);
      }
    };

    socketConnection.onerror = (error) => {
      console.log('WebSocket error: ', error);
      alert('Falha ao conectar, cheque o ip.');
      setIsModalVisible(true); // Reopen the modal on connection error
    };

    socketConnection.onclose = () => {
      console.log('WebSocket connection closed');
      setIsModalVisible(true); // Show the modal to enter IP again
    };

    setSocket(socketConnection);
  };

  useEffect(() => {
    // Cleanup WebSocket connection on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  const handleSendToKitchen = (index) => {
    const order = receivedOrders[index];
    if (socket) {
      const { Total, ...orderForCozinha } = order; // Exclude the Total field
      const forwardedOrder = { ...orderForCozinha, forwardedToCozinha: true };
      socket.send(JSON.stringify(forwardedOrder));
      
      setReceivedOrders((prevOrders) => prevOrders.filter((_, i) => i !== index));
    }
  };

  const handleCancelOrder = (index) => {
    setReceivedOrders((prevOrders) => prevOrders.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>IP do Servidor</Text>
          <TextInput
            style={styles.input}
            placeholder="Insira o IP do servidor"
            value={serverIp}
            onChangeText={setServerIp}
          />
          <Button
            title="Connect"
            onPress={() => {
              connectToServer();
            }}
          />
        </View>
      </Modal>
      <Text style={styles.header}>Pedidos Recebidos:</Text>
      {receivedOrders.map((order, index) => (
        <View key={index} style={styles.orderContainer}>
          <Text style={styles.orderText}>Nome: {order.Nome}</Text>
          <Text style={styles.orderText}>
            Produtos:{" "}
            {order.Produtos.map(
              (produto) => `${produto.flavor} (${produto.ingredients || "Sem adicionais"})`
            ).join(", ")}
          </Text>
          {order.Total && (
            <Text style={styles.orderText}>Total: R$ {order.Total}</Text>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleSendToKitchen(index)}
            >
              <Text style={styles.buttonText}>Mandar para cozinha</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelOrder(index)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 16,
    color: 'white',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    width: '80%',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 40, // Added margin to move it down
  },
  orderContainer: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  orderText: {
    fontSize: 16,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sendButton: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
