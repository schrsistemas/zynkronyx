import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  async enqueue(data: any) {
    this.logger.log(`Enqueue: ${JSON.stringify(data)}`);

    return this.prisma.syncQueue.create({
      data: {
        table: data.table,
        operation: data.operation,
        payload: data.payload,
      },
    });
  }

  async processQueue() {
    const items = await this.prisma.syncQueue.findMany({
      where: { status: 'PENDING' },
      orderBy: { id: 'asc' },
      take: 10,
    });

    for (const item of items) {
      try {
        this.logger.log(`Processing ID ${item.id}`);

        // Aqui futuramente entra regra real por tabela

        await this.prisma.syncQueue.update({
          where: { id: item.id },
          data: {
            status: 'DONE',
            processedAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Erro ID ${item.id}: ${error.message}`);

        await this.prisma.syncQueue.update({
          where: { id: item.id },
          data: {
            status: 'ERROR',
            attempts: { increment: 1 },
          },
        });
      }
    }
  }
}
