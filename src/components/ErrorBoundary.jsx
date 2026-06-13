import React from 'react';
import { Button } from './ui/Components';
import SafeIcon from '../common/SafeIcon';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la interfaz de repuesto
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // También puedes enviar el error a un servicio de reporte de errores
    console.error("Error capturado por Boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/'; // Redirigir al inicio para limpiar el estado
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <SafeIcon name="AlertTriangle" className="w-10 h-10" />
          </div>
          
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-4">
            ¡Ups! Algo no salió como esperábamos
          </h1>
          
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Hemos detectado un error inesperado en la interfaz. No te preocupes, tu información está segura en nuestros servidores.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => window.location.reload()}
              className="px-8 shadow-lg shadow-primary/20"
            >
              <SafeIcon name="RefreshCw" className="w-4 h-4 mr-2" />
              Recargar página
            </Button>
            
            <Button 
              variant="outline"
              onClick={this.handleReset}
            >
              Volver al Inicio
            </Button>
          </div>

          <div className="mt-12 p-4 bg-gray-100 rounded-xl max-w-lg w-full overflow-hidden">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Detalles técnicos para soporte</p>
            <div className="text-left text-[11px] font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap">
              {this.state.error?.toString() || 'Error desconocido'}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;