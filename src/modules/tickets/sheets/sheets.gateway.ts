import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: 'sheets',
})
export class SheetsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SheetsGateway.name);
  
  @WebSocketServer()
  server!: Server;

  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`✅ Cliente conectado: ${client.id}`);
    this.connectedClients.set(client.id, client);
    
    client.emit('connected', { 
      message: 'Conectado ao servidor em tempo real',
      clientId: client.id,
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Cliente desconectado: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  notifyUpdate(data: any) {
    const clientCount = this.connectedClients.size;
    this.logger.log(`📢 Notificando ${clientCount} cliente(s) sobre atualização`);
    
    this.server.emit('tickets-updated', {
      timestamp: new Date(),
      message: 'Dados da planilha atualizados',
      ...data,
    });
  }

  startHeartbeat() {
    setInterval(() => {
      this.server.emit('heartbeat', { 
        timestamp: new Date(),
        clientCount: this.connectedClients.size,
      });
    }, 30000);
  }
}