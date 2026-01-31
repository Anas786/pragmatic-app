export interface CompanyCardProps {
    companyName: string;
    date: string;
    time: string;
    logo: string;
    powerReadings: any[];
    efficiency: number;
    onExpandView: () => void;
    onverticalView: () => void;
    isactive: boolean;
    isopen: () => void;
  }