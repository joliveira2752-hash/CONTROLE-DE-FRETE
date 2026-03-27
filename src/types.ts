export interface Branch {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'master' | 'admin' | 'user';
  branchId?: string; // Optional for master, required for others
  name: string;
  approved?: boolean;
}

export interface Freight {
  id: string;
  branchId: string;
  description: string;
  product: string;
  origin: string;
  destination: string;
  totalWeight: number;
  status: 'Aberto' | 'Finalizado';
  date: string;
  observations?: string;
  valorFrete?: number; // Preço unitário empresa (R$/kg)
  valorRecebido?: number; // Total recebido (calculado ou fixo)
  valorPagoMotorista?: number; // Preço unitário motorista (R$/kg)
}

export interface Employee {
  id: string;
  branchId: string;
  name: string;
  role: string;
  active: boolean;
}

export interface Loading {
  id: string;
  branchId: string;
  freightId: string;
  driverName: string;
  plate: string;
  weight: number;
  manifestoDone: boolean;
  unloaded: boolean;
  date: string; // Data de Carregamento
  manifestoDate?: string;
  unloadedDate?: string;
  observations?: string;
  orderGiverId?: string;
  orderGiverName?: string;
  driverUnitPrice?: number;
  driverValue?: number;
}
