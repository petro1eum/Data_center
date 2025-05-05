import React from 'react';
import { Card, Row, Col, Statistic, Typography, Divider, Alert, Descriptions, Space, Tooltip } from 'antd';
import { 
  BarChartOutlined, 
  DollarCircleOutlined, 
  TeamOutlined, 
  WarningOutlined, 
  HddOutlined, 
  ThunderboltOutlined, 
  CloudServerOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

// Компонент для карточки статистики
const StatCard = ({ title, tooltip, value, prefix, suffix, precision, formatter, color, children }) => (
  <Card 
    hoverable 
    size="small" 
    styles={{ body: { padding: '12px 16px' } }}
    style={{ backgroundColor: color + '10' }}
  >
    <Statistic 
      title={<Tooltip title={tooltip || title}><Space size="small">{React.cloneElement(prefix, { style: { fontSize: 14 }})}{title}</Space></Tooltip>}
      value={value}
      prefix={prefix ? React.cloneElement(prefix, { style: { color: color, marginRight: 6 }}) : null}
      suffix={suffix}
      precision={precision}
      formatter={formatter}
      valueStyle={{ color: color, fontSize: 20, fontWeight: 500 }}
    />
    {children && <div style={{ marginTop: 8 }}>{children}</div>}
  </Card>
);

/**
 * Компонент панели результатов с улучшенным дизайном Ant Design
 */
const ResultsPanel = ({ results, formData, modelSizeError }) => {
  return (
    <Card variant="borderless">
      <Title level={4} style={{ marginBottom: 24 }}>Результаты расчетов</Title>
      
      {modelSizeError && (
        <Alert
          message="Предупреждение о размере модели"
          description={modelSizeError}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard 
            title="Инфраструктура"
            value={results.requiredGpu}
            prefix={<BarChartOutlined />}
            suffix="GPU"
            color="#1890ff"
            tooltip="Общее количество GPU, необходимое для заданной нагрузки"
          >
            <Descriptions size="small" column={1} colon={false} styles={{ label: { color: '#595959' }, content: { fontWeight: 500, color: '#262626' } }}>
              <Descriptions.Item label="Серверов" span={1}>{results.serversRequired}</Descriptions.Item>
              <Descriptions.Item label="Мощность" span={1}>{`${results.powerConsumptionKw.toFixed(1)} кВт`}</Descriptions.Item>
            </Descriptions>
          </StatCard>
        </Col>
        
        <Col xs={24} sm={8}>
           <StatCard 
            title="Стоимость (CapEx)"
            value={results.capexUsd}
            prefix={<DollarCircleOutlined />}
            precision={0}
            formatter={(value) => `$${value.toLocaleString()}`}
            color="#52c41a"
            tooltip="Общие первоначальные инвестиции в оборудование"
          >
             <Descriptions size="small" column={1} colon={false} styles={{ label: { color: '#595959' }, content: { fontWeight: 500, color: '#262626' } }}>
              <Descriptions.Item label="OpEx/год" span={1}>{`$${results.annualOpexUsd.toLocaleString()}`}</Descriptions.Item>
              <Descriptions.Item label="TCO (5 лет)" span={1}>{`$${results.fiveYearTco.toLocaleString()}`}</Descriptions.Item>
            </Descriptions>
          </StatCard>
        </Col>
        
        <Col xs={24} sm={8}>
          <StatCard 
            title="Производительность"
            value={formData.userLoadConcurrentUsers}
            prefix={<TeamOutlined />}
            suffix="Польз."
            color="#722ed1"
            tooltip="Количество одновременных пользователей, которых может обслужить система"
          >
            <Descriptions size="small" column={1} colon={false} styles={{ label: { color: '#595959' }, content: { fontWeight: 500, color: '#262626' } }}>
              <Descriptions.Item label="Модель" span={1}>{`${formData.modelParamsNumBillion}B`}</Descriptions.Item>
              <Descriptions.Item label="Точность" span={1}>{`${formData.modelParamsBitsPrecision}-бит`}</Descriptions.Item>
            </Descriptions>
          </StatCard>
        </Col>
      </Row>
      
      <Divider />
        
      <Title level={5} style={{ marginBottom: 16 }}>Детализация затрат</Title>
        
      <Row gutter={[32, 16]}> 
        <Col xs={24} md={12}>
          <Title level={5} style={{ fontSize: 16, marginBottom: 12 }}>Капитальные затраты (CapEx):</Title>
          <Descriptions bordered size="small" column={1} styles={{ label: { width: '60%' } }}>
            <Descriptions.Item label="Стоимость GPU">${results.totalGpuCost?.toLocaleString() || '-'}</Descriptions.Item>
            <Descriptions.Item label="Стоимость серверов">${results.totalServerCost?.toLocaleString() || '-'}</Descriptions.Item>
            <Descriptions.Item label="Сетевое оборудование">${results.networkCost.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Хранилище (SSD/NVMe)">${Math.round(results.storageCostUsd).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="RAM">${Math.round(results.totalRamCost).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label={<Text strong>Общие CapEx</Text>}><strong>${results.capexUsd.toLocaleString()}</strong></Descriptions.Item>
          </Descriptions>
        </Col>
          
        <Col xs={24} md={12}>
          <Title level={5} style={{ fontSize: 16, marginBottom: 12 }}>Операционные затраты (OpEx):</Title>
          <Descriptions bordered size="small" column={1} styles={{ label: { width: '60%' } }}>
            <Descriptions.Item label="Энергопотребление">{`${Math.round(results.annualEnergyKwh).toLocaleString()} кВт*ч/год`}</Descriptions.Item>
            <Descriptions.Item label="Стоимость электроэнергии">{`$${Math.round(results.energyCostAnnual).toLocaleString()}/год`}</Descriptions.Item>
            <Descriptions.Item label="Обслуживание">{`$${Math.round(results.maintenanceCostAnnual).toLocaleString()}/год`}</Descriptions.Item>
            <Descriptions.Item label={<Text strong>Общие OpEx</Text>}><strong>{`$${Math.round(results.annualOpexUsd).toLocaleString()}/год`}</strong></Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>
        
      <Divider />

      <Title level={5} style={{ marginBottom: 16 }}>Дополнительные данные:</Title>
      <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 3 }}>
         <Descriptions.Item label={<><CloudServerOutlined style={{marginRight: 4}}/>Сеть</>}>{results.networkType}</Descriptions.Item>
         <Descriptions.Item label={<><HddOutlined style={{marginRight: 4}}/>Хранилище</>}>{`${(results.storageRequirementsGB / 1000).toFixed(1)} ТБ`}</Descriptions.Item>
         <Descriptions.Item label={<><ThunderboltOutlined style={{marginRight: 4}}/>RAM/сервер</>}>{`${Math.ceil(results.ramRequirementPerServerGB)} ГБ`}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default ResultsPanel;