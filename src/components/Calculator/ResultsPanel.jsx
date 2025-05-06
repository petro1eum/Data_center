import React from 'react';
import { Card, Row, Col, Statistic, Typography, Divider, Alert, Descriptions, Space, Tooltip, List, Progress, Tag, Button, Spin } from 'antd';
import { 
  BarChartOutlined, 
  DollarCircleOutlined, 
  TeamOutlined, 
  WarningOutlined, 
  HddOutlined, 
  ThunderboltOutlined, 
  CloudServerOutlined, 
  ExclamationCircleOutlined,
  CloudOutlined,
  CodeOutlined,
  DashboardOutlined,
  LikeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { SOFTWARE_PRESETS } from '../../data/softwarePresets';
import TcoChart from './TcoChart';

const { Title, Text, Paragraph } = Typography;

// Вспомогательная функция для безопасного деления
const safeDivide = (numerator, denominator) => {
    if (denominator === 0 || !denominator || isNaN(denominator)) return 0;
    return numerator / denominator;
};

// Компонент для карточки статистики 
const StatCard = ({ title, tooltip, value, prefix, suffix, precision, formatter, color, children }) => (
  <Card 
    hoverable 
    size="small" 
    styles={{ body: { padding: '12px 16px' } }}
    style={{ backgroundColor: color + '10' }} 
  >
    <Statistic 
      title={
          tooltip ? (
            <Tooltip title={tooltip}><Space size="small">{prefix && React.cloneElement(prefix, { style: { fontSize: 14 }})}{title}</Space></Tooltip>
          ) : (
            <Space size="small">{prefix && React.cloneElement(prefix, { style: { fontSize: 14 }})}{title}</Space>
          )
      }
      value={value}
      suffix={suffix}
      precision={precision}
      formatter={formatter}
      valueStyle={{ color: color || '#1890ff', fontSize: 20, fontWeight: 500 }}
    />
    {children && <div style={{ marginTop: 8, fontSize: '12px', lineHeight: '1.4' }}>{children}</div>}
  </Card>
);

// Функция для форматирования больших чисел - ИСПРАВЛЕНО
const formatNumber = (num, precision = 0) => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    
    const options = { 
        maximumFractionDigits: precision,
        minimumFractionDigits: precision,
    };
    
    // Используем "тыс" только для чисел >= 10 000
    if (num >= 10000) { 
        const valueInThousands = num / 1000;
        // Уменьшаем точность для тысяч, если она больше 0
        const thousandPrecision = precision > 0 ? Math.max(0, precision - 1) : 0;
        const thousandOptions = { 
             maximumFractionDigits: thousandPrecision,
             minimumFractionDigits: thousandPrecision,
        };
        const formatter = new Intl.NumberFormat('ru-RU', thousandOptions);
        return `${formatter.format(valueInThousands)} тыс`;
    } 
    // Убираем млрд и млн для простоты, можно вернуть если надо
    // if (num >= 1e9) return `${formatter.format(num / 1e9)} млрд`; 
    // if (num >= 1e6) return `${formatter.format(num / 1e6)} млн`;
    
    // Для чисел меньше 10 000 просто форматируем с указанной точностью
    const formatter = new Intl.NumberFormat('ru-RU', options);
    return formatter.format(num);
};

// Функция для форматирования валюты 
const formatCurrency = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    const formatter = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        maximumFractionDigits: 0,
        minimumFractionDigits: 0, 
    });
    return formatter.format(Math.round(num)); 
};

// Компонент для отображения рейтинга 
const RatingDisplay = ({ rating }) => {
    // Добавим проверку и fallback текст, если рейтинг не пришел
    if (!rating || typeof rating.score !== 'number') { 
        return (
             <Card 
                title={<Space><LikeOutlined /> Рейтинг конфигурации</Space>} 
                size="small" 
                style={{ marginTop: 16 }}
                styles={{ header: { backgroundColor: '#fafafa' }, body: { paddingTop: 16, paddingBottom: 8 } }} 
            >
                 <Text type="secondary">Рейтинг пока не рассчитан.</Text>
             </Card>
        );
    } 

    let color = "default";
    if (rating.score >= 90) color = "success";
    else if (rating.score >= 75) color = "processing";
    else if (rating.score >= 50) color = "blue";
    else if (rating.score >= 25) color = "warning";
    else color = "error";
    
    return (
        <Card 
            title={<Space><LikeOutlined /> Рейтинг конфигурации</Space>} 
            size="small" 
            hoverable 
            style={{ marginTop: 16 }} 
            styles={{ header: { backgroundColor: '#fafafa' }, body: { paddingTop: 16, paddingBottom: 8 } }} 
        >
            <Row gutter={[16, 8]} align="middle">
                <Col xs={24} sm={6} md={5} lg={4} style={{ textAlign: 'center' }}>
                    <Progress 
                        type="dashboard" 
                        percent={rating.score} 
                        format={(percent) => `${percent}/100`}
                        strokeColor={Progress.getStatusColor ? Progress.getStatusColor(color) : color} 
                        size={80}
                        status={color === 'error' ? 'exception' : (color === 'success' ? 'success' : 'normal')} 
                    />
                     <Tag color={color} style={{ marginTop: 8, fontSize: 14 }}>{rating.label || 'N/A'}</Tag>
                </Col>
                <Col xs={24} sm={18} md={19} lg={20}>
                    <Paragraph style={{ marginBottom: 4 }}>{rating.description || "Рейтинг не рассчитан."}</Paragraph>
                </Col>
            </Row>
        </Card>
    );
};

/**
 * Компонент панели результатов
 */
const ResultsPanel = ({ results, formData, modelSizeError, configWarnings, performanceWarning, findCheapestHardwareConfig, isFindingConfig, cheapestConfigs, findError }) => {
  const {
    requiredGpu,
    serversRequired,
    capexUsd,
    annualOpexUsd,
    fiveYearTco,
    powerConsumptionKw,
    estimatedTokensPerSecPerGpu,
    totalEffectiveTokensPerSec,
    configRating,
    totalGpuCost,
    totalServerCost,
    networkCost,
    storageCostUsd,
    totalRamCost,
    energyCostAnnual,
    maintenanceCostAnnual,
    annualSoftwareCost,
    annualExternalToolCost,
    storageRequirementsGB,
    ramRequirementPerServerGB,
    annualEnergyKwh
  } = results || {}; 

  const { 
      networkType, 
      storageType, 
      ramType, 
      selectedSoftwarePreset, 
      isAgentModeEnabled, 
      userLoadConcurrentUsers,
      dcCostsElectricityCostUsdPerKwh
  } = formData || {};

  const cardHeadStyle = { backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={4} style={{ marginBottom: 24 }}>Результаты расчетов</Title>
        
        {/* Предупреждения */} 
        {modelSizeError && <Alert message={modelSizeError} type="error" showIcon style={{ marginBottom: 16 }} closable />}
        {performanceWarning && <Alert message={performanceWarning} type="warning" showIcon style={{ marginBottom: 16 }} closable />}
        {configWarnings && configWarnings.length > 0 && configWarnings.map((warn, index) => (
            <Alert key={index} message={warn} type="warning" showIcon style={{ marginBottom: 16 }} closable />
        ))}
        
        {/* Основные KPI */} 
        <Row gutter={[16, 24]} style={{ marginBottom: 24 }}> 
            {/* Инфраструктура */}
            <Col xs={24} sm={12} md={8} lg={6}>
                <StatCard 
                  title="Инфраструктура"
                  value={formatNumber(requiredGpu)}
                  prefix={<HddOutlined />} // Заменили иконку на HDD для GPU?
                  suffix="GPU"
                  color="#1890ff"
                  tooltip="Общее количество GPU, необходимое для заданной нагрузки"
                  precision={0}
                >
                  <Text type="secondary">Серверов: </Text><Text strong>{formatNumber(serversRequired)}</Text><br />
                  <Text type="secondary">Мощность: </Text><Text strong>{`${formatNumber(powerConsumptionKw, 1)} кВт`}</Text>
                </StatCard>
            </Col>
             {/* Стоимость */}
            <Col xs={24} sm={12} md={8} lg={6}>
                <StatCard 
                  title="Стоимость (CapEx)"
                  value={formatCurrency(capexUsd)}
                  prefix={<DollarCircleOutlined />}
                  color="#52c41a"
                  tooltip="Общие первоначальные инвестиции в оборудование"
                  precision={0}
                >
                   <Text type="secondary">OpEx/год: </Text><Text strong>{`${formatCurrency(annualOpexUsd)}/год`}</Text><br />
                   <Text type="secondary">TCO (5 лет): </Text><Text strong>{formatCurrency(fiveYearTco)}</Text>
                </StatCard>
            </Col>
              {/* Нагрузка / Произв. */}
             <Col xs={24} sm={12} md={8} lg={6}>
                <StatCard 
                  title="Нагрузка / Произв."
                  value={formatNumber(userLoadConcurrentUsers)}
                  prefix={<TeamOutlined />}
                  suffix="Пользователей"
                  color="#722ed1"
                  tooltip="Количество одновременных пользователей и расчетная производительность системы"
                  precision={0}
                >
                    <Text type="secondary">Tokens/sec/GPU (Base): </Text><Text strong>{formatNumber(estimatedTokensPerSecPerGpu, 1)}</Text><br />
                    <Text type="secondary">Total Tokens/sec (Eff.): </Text><Text strong>{formatNumber(totalEffectiveTokensPerSec, 0)}</Text>
                </StatCard>
            </Col>
              {/* Энергоэффективность */}
             <Col xs={24} sm={12} md={8} lg={6}>
                <StatCard 
                  title="Энергоэффективность"
                  value={formatNumber(safeDivide(totalEffectiveTokensPerSec, powerConsumptionKw), 0)} 
                  prefix={<ThunderboltOutlined />} 
                  suffix="Tok/s/kW" 
                  color="#eb2f96"
                  tooltip="Количество обрабатываемых токенов в секунду на киловатт потребляемой мощности"
                  precision={0}
                >
                   <Text type="secondary">Всего кВт: </Text><Text strong>{formatNumber(powerConsumptionKw, 1)}</Text><br />
                   <Text type="secondary">Цена $/кВт*ч: </Text><Text strong>{formatCurrency(dcCostsElectricityCostUsdPerKwh)}</Text>
                </StatCard>
            </Col>
        </Row>
        
        {/* Рейтинг конфигурации - Убедились, что он здесь */}
        <RatingDisplay rating={configRating} />
        
        <Divider style={{ marginTop: 24, marginBottom: 16 }}/>
        
        {/* Детализация затрат */}
        <Title level={5} style={{ marginBottom: 16 }}>Детализация затрат</Title>
        <Row gutter={[32, 16]}> 
          <Col xs={24} md={12}>
            <Title level={5} style={{ fontSize: 16, marginBottom: 12 }}>Капитальные затраты (CapEx):</Title>
            <Descriptions bordered size="small" column={1} styles={{ label: { width: '60%' } }}>
              <Descriptions.Item label="Стоимость GPU">{formatCurrency(totalGpuCost)}</Descriptions.Item>
              <Descriptions.Item label="Стоимость серверов (без GPU)">{formatCurrency(totalServerCost)}</Descriptions.Item>
              <Descriptions.Item label="Сетевое оборудование">{formatCurrency(networkCost)}</Descriptions.Item>
              <Descriptions.Item label="Хранилище (SSD/NVMe)">{formatCurrency(storageCostUsd)}</Descriptions.Item>
              <Descriptions.Item label="RAM">{formatCurrency(totalRamCost)}</Descriptions.Item>
              <Descriptions.Item label={<Text strong>Общие CapEx</Text>}><strong>{formatCurrency(capexUsd)}</strong></Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} md={12}>
            <Title level={5} style={{ fontSize: 16, marginBottom: 12 }}>Операционные затраты (OpEx - Год):</Title>
            <Descriptions bordered size="small" column={1} styles={{ label: { width: '60%' } }}>
              <Descriptions.Item label="Энергопотребление">{`${formatNumber(annualEnergyKwh, 0)} кВт*ч/год`}</Descriptions.Item> 
              <Descriptions.Item label="Стоимость электроэнергии">{`${formatCurrency(energyCostAnnual)}/год`}</Descriptions.Item>
              <Descriptions.Item label="Обслуживание">{`${formatCurrency(maintenanceCostAnnual)}/год`}</Descriptions.Item>
              {(annualSoftwareCost > 0) && (
                  <Descriptions.Item label="Стоимость ПО">{`${formatCurrency(annualSoftwareCost)}/год`}</Descriptions.Item>
              )}
              {isAgentModeEnabled && (annualExternalToolCost > 0) && (
                  <Descriptions.Item label="Стоимость внешних Tools">{`${formatCurrency(annualExternalToolCost)}/год`}</Descriptions.Item>
              )}
              <Descriptions.Item label={<Text strong>Общие OpEx</Text>}><strong>{`${formatCurrency(annualOpexUsd)}/год`}</strong></Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
        
        <Divider style={{ marginTop: 24, marginBottom: 16 }}/>

        {/* Дополнительные данные конфигурации */} 
        <Title level={5} style={{ marginBottom: 16 }}>Дополнительные данные конфигурации:</Title>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}> 
           <Descriptions.Item label={<><CloudOutlined style={{marginRight: 4}}/>Сеть</>}>{networkType || 'N/A'}</Descriptions.Item> 
           <Descriptions.Item label={<><HddOutlined style={{marginRight: 4}}/>Хранилище</>}>{storageType || 'N/A'}</Descriptions.Item> 
           <Descriptions.Item label={<><CodeOutlined style={{marginRight: 4}}/>RAM</>}>{ramType || 'N/A'}</Descriptions.Item> 
           <Descriptions.Item label="ПО Сервера">{SOFTWARE_PRESETS[selectedSoftwarePreset]?.name || 'N/A'}</Descriptions.Item>
           <Descriptions.Item label="Расчетное Хран. (Общее)">{`${formatNumber(storageRequirementsGB / 1000, 1)} ТБ`}</Descriptions.Item> 
           <Descriptions.Item label="Расчетная RAM / Сервер">{`${formatNumber(ramRequirementPerServerGB, 0)} ГБ`}</Descriptions.Item> 
        </Descriptions>
      
      {/* График TCO */}
      {typeof capexUsd === 'number' && typeof annualOpexUsd === 'number' && fiveYearTco > 0 && (
        <Card title="Динамика TCO" hoverable styles={{ header: cardHeadStyle, body: { paddingTop: 16 } }} style={{ marginTop: 16 }}>
          <TcoChart capex={capexUsd} annualOpex={annualOpexUsd} />
        </Card>
      )}

      {/* Блок поиска самой дешевой конфигурации */}
      <div style={{ marginTop: '20px' }}>
          <Title level={5}>Оптимизация стоимости</Title>
          <Paragraph type="secondary">
              Найти 3 самые дешевые конфигурации GPU+Сервер, которые подходят для текущей модели, точности и нагрузки.
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                  type="primary" 
                  onClick={findCheapestHardwareConfig} 
                  loading={isFindingConfig}
                  disabled={isFindingConfig}
              >
                  Найти самую дешевую конфигурацию
              </Button>

              <Spin spinning={isFindingConfig} tip="Идет поиск конфигураций...">
                  <div style={{ minHeight: '50px', marginTop: '15px' }}> {/* Минимальная высота для Spin */}
                      {findError && (
                          <Alert message={findError} type="error" showIcon />
                      )}
                      {cheapestConfigs && cheapestConfigs.length > 0 && !findError && (
                          <List
                              header={<b>Топ-{cheapestConfigs.length} самых дешевых конфигураций:</b>}
                              bordered
                              dataSource={cheapestConfigs}
                              renderItem={(item, index) => (
                                  <List.Item>
                                      <Typography.Text>
                                          <b>{index + 1}. GPU:</b> {item.gpuName}, <b>Сервер:</b> {item.serverName} <br />
                                          <b>TCO (5 лет):</b> {formatCurrency(item.fiveYearTco)} 
                                          (Требуется GPU: {item.requiredGpu}, Серверов: {item.serversRequired}, Рейтинг: {item.ratingScore}/100 {item.ratingLabel})
                                      </Typography.Text>
                                  </List.Item>
                              )}
                          />
                      )}
                      {/* Можно добавить сообщение, если поиск завершен, но ничего не найдено (кроме ошибки) */}
                      {!isFindingConfig && !findError && cheapestConfigs && cheapestConfigs.length === 0 && (
                           <Text type="secondary">Результаты поиска будут отображены здесь.</Text> 
                      )}
                  </div>
              </Spin>
          </Space>
      </div>
    </Space>
  );
};

export default ResultsPanel;