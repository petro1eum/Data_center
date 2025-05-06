import React from 'react';
import { Line } from '@ant-design/plots';
import { Typography } from 'antd';

const { Text } = Typography;

/**
 * Компонент для отображения графика TCO за 5 лет.
 * @param {number} capex - Капитальные затраты (год 0).
 * @param {number} annualOpex - Годовые операционные затраты.
 */
const TcoChart = ({ capex = 0, annualOpex = 0 }) => {
  // Генерируем данные для графика на 6 точек (Год 0 - Год 5)
  const data = [];
  for (let year = 0; year <= 5; year++) {
    const tco = capex + annualOpex * year;
    data.push({
      year: `Год ${year}`,
      value: Math.round(tco), // Округляем до целых долларов
      type: 'TCO',
    });
    // Можно добавить линии для CapEx и OpEx отдельно, если нужно
    // data.push({ year: `Год ${year}`, value: year > 0 ? Math.round(annualOpex * year) : 0, type: 'Cumulative OpEx' });
    // data.push({ year: `Год ${year}`, value: Math.round(capex), type: 'CapEx' });
  }

  const config = {
    data,
    xField: 'year',
    yField: 'value',
    // seriesField: 'type', // Раскомментировать, если добавляем CapEx/OpEx линии
    point: {
      size: 4,
      shape: 'circle',
      style: {
        fill: 'white',
        stroke: '#5B8FF9',
        lineWidth: 2,
      },
    },
    tooltip: {
      formatter: (datum) => ({
        name: datum.type || 'TCO',
        value: `$${(datum.value || 0).toLocaleString()}`,
      }),
      title: (title) => title, // Показываем "Год X" в заголовке тултипа
       customContent: (title, items) => {
            if (!items || items.length === 0) {
                return null;
            }
            const { value } = items[0]; // Берем значение первого элемента (TCO)
            return (
                <div style={{ padding: '8px' }}>
                    <Text strong>{title}</Text>
                    <div style={{ marginTop: '4px' }}>
                        <Text>TCO: {value}</Text>
                    </div>
                </div>
            );
        }
    },
    yAxis: {
      label: {
        formatter: (v) => `$${parseInt(v, 10).toLocaleString()}`,
      },
      title: {
          text: 'Общая стоимость владения (USD)',
          style: { fontSize: 12 }
      }
    },
    xAxis: {
        title: {
            text: 'Год',
            style: { fontSize: 12 }
        }
    },
    smooth: true, // Сглаживание линии
    lineStyle: {
        lineWidth: 3,
    },
    // legend: { position: 'top-right' }, // Раскомментировать, если добавляем CapEx/OpEx линии
    height: 300, // Фиксированная высота графика
     padding: 'auto',
  };

  // Проверка, установлена ли библиотека @ant-design/plots
  if (!Line) {
    return (
      <Text type="danger">
        Ошибка: Библиотека @ant-design/plots не найдена. Пожалуйста, установите ее: npm install @ant-design/plots
      </Text>
    );
  }

  return <Line {...config} />;
};

export default TcoChart; 