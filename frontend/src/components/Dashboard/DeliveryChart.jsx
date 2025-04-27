import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './DeliveryChart.css';

function DeliveryChart({ data, type }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: type === 'pie' ? 'right' : 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#666',
            borderColor: '#e0e0e0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true
          }
        }
      };

      if (type === 'bar') {
        options.scales = {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f2f2f2'
            }
          }
        };
      }

      chartInstance.current = new Chart(ctx, {
        type: type,
        data: data,
        options: options
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, type]);

  return (
    <div className="chart-wrapper">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}

export default DeliveryChart;