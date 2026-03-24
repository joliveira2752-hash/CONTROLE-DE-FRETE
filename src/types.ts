export interface Freight {
  id: string;
  description: string;
  product: string;
  origin: string;
  destination: string;
  totalWeight: number;
  status: 'Aberto' | 'Finalizado';
  date: string;
  observations?: string;
}

export interface Loading {
  id: string;
  freightId: string;
  driverName: string;
  plate: string;
  weight: number;
  manifestoDone: boolean;
  unloaded: boolean;
  date: string;
  observations?: string;
}
