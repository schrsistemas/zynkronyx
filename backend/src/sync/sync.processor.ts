import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncProcessor implements OnModuleInit {
  private readonly logger = new Logger(SyncProcessor.name);
  private isRunning = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    setInterval(() => this.run(), 3000);
  }

  private async run() {
    if (this.isRunning) {
      this.logger.warn('Processamento ja em execucao, evitando concorrencia');
      return;
    }

    this.isRunning = true;

    try {
      const items = await this.prisma.syncQueue.findMany({
        where: {
          status: 'PENDING',
          attempts: { lt: 5 }
        },
        orderBy: { id: 'asc' },
        take: 20
      });

      for (const item of items) {
        await this.processItem(item);
      }
    } catch (error) {
      this.logger.error('Erro geral no processamento', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processItem(item: any) {
    try {
      await this.prisma.syncQueue.update({
        where: { id: item.id },
        data: { status: 'PROCESSING' }
      });

      this.logger.log(`Processando ID ${item.id} - ${item.table}`);

      // Simulacao de regra por tabela
      switch (item.table) {
        case 'CLIENTE':
          // aplicar regra real aqui
          break;
        default:
          this.logger.warn(`Tabela nao mapeada: ${item.table}`);
      }

      await this.prisma.syncQueue.update({
        where: { id: item.id },
        data: {
          status: 'DONE',
          processedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error(`Erro no item ${item.id}: ${error.message}`);

      await this.prisma.syncQueue.update({
        where: { id: item.id },
        data: {
          status: 'ERROR',
          attempts: { increment: 1 }
        }
      });
    }
  }
}
