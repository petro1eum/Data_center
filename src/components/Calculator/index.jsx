import React from 'react';
import { Layout, Row, Col, Typography, Space, Tabs } from 'antd';
import { CalculatorOutlined, BarChartOutlined, FileTextOutlined, LineChartOutlined, ReadOutlined } from '@ant-design/icons';
import { useCalculator } from '../../hooks/useCalculator';
import SettingsPanel from './SettingsPanel';
import ResultsPanel from './ResultsPanel';
import TechnicalReport from './TechnicalReport';
import AnalyticsPanel from './AnalyticsPanel';
import LlmHandbook from './LlmHandbook';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

/**
 * Основной компонент калькулятора с улучшенным дизайном Ant Design и вкладкой Аналитики
 */
const GenAIDataCenterCalculator = () => {
  const calculator = useCalculator();
  
  // Формируем items для Tabs
  const tabItems = [
    {
      label: <><BarChartOutlined /> Результаты</>,
      key: 'results',
      children: <ResultsPanel 
                    results={calculator.results}
                    formData={calculator.formData}
                    modelSizeError={calculator.modelSizeError}
                    configWarnings={calculator.configWarnings}
                  />,
    },
    {
      label: <><LineChartOutlined /> Аналитика</>,
      key: 'analytics',
      children: <AnalyticsPanel 
                    results={calculator.results}
                    formData={calculator.formData}
                  />,
    },
    {
      label: <><FileTextOutlined /> Тех. Отчет</>,
      key: 'report',
      children: <TechnicalReport 
                    formData={calculator.formData}
                    results={calculator.results}
                    modelSizeError={calculator.modelSizeError}
                  />,
    },
    {
      label: <><ReadOutlined /> Справочник LLM</>,
      key: 'handbook',
      children: <LlmHandbook />,
    },
  ];
  
  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}> 
      <Header 
        style={{ 
          background: 'linear-gradient(135deg, #1f4e79 0%, #3d7ab8 100%)',
          padding: '0 24px', 
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <CalculatorOutlined style={{ fontSize: '28px', color: '#fff', marginRight: '16px' }} />
        <div style={{ flexGrow: 1 }}>
          <Title level={3} style={{ color: 'white', margin: 0, lineHeight: '1.2' }}>Калькулятор ЦОД для GenAI</Title>
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: 0, fontSize: '14px' }}>
            Расчет ресурсов и стоимости инфраструктуры
          </Paragraph>
        </div>
      </Header>
      <Content style={{ padding: '24px', margin: '16px', background: '#fff', borderRadius: '8px' }}> 
        <Row gutter={[24, 24]}>
          {/* Левая колонка настроек */}
          <Col xs={24} lg={10}>
            <SettingsPanel 
              formData={calculator.formData}
              handleFormChange={calculator.handleFormChange}
              selectedModelPreset={calculator.selectedModelPreset}
              selectedGpuPreset={calculator.selectedGpuPreset}
              selectedServerPreset={calculator.selectedServerPreset}
              selectedNetworkPreset={calculator.selectedNetworkPreset}
              selectedStoragePreset={calculator.selectedStoragePreset}
              selectedRamPreset={calculator.selectedRamPreset}
              selectedSoftwarePreset={calculator.selectedSoftwarePreset}
              applyModelPreset={calculator.applyModelPreset}
              applyGpuPreset={calculator.applyGpuPreset}
              applyServerPreset={calculator.applyServerPreset}
              applyNetworkPreset={calculator.applyNetworkPreset}
              applyStoragePreset={calculator.applyStoragePreset}
              applyRamPreset={calculator.applyRamPreset}
              applySoftwarePreset={calculator.applySoftwarePreset}
              setBatchingOptimizationFactor={calculator.setBatchingOptimizationFactor}
              activeTab={calculator.activeTab}
              setActiveTab={calculator.setActiveTab}
              showModelInfo={calculator.showModelInfo}
              setShowModelInfo={calculator.setShowModelInfo}
            />
          </Col>

          {/* Правая колонка с вкладками */}
          <Col xs={24} lg={14}>
            <Tabs 
              defaultActiveKey="results" 
              type="card" 
              items={tabItems}
            />
          </Col>
        </Row>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#f0f2f5', color: '#888' }}>
        GenAI Data Center Calculator ©{new Date().getFullYear()} by Ed Cherednik
      </Footer>
    </Layout>
  );
};

export default GenAIDataCenterCalculator;