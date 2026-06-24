import React from 'react';
import { ConfigProvider, Layout, Row, Col, Typography, Space, Tabs } from 'antd';
import { BarChartOutlined, FileTextOutlined, LineChartOutlined, ReadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { interferaTheme } from '../../theme';
import PerformancePanel from './PerformancePanel';
import { useCalculator } from '../../hooks/useCalculator';
import SettingsPanel from './SettingsPanel';
import TechnicalReport from './TechnicalReport';
import AnalyticsPanel from './AnalyticsPanel';
import LlmHandbook from './LlmHandbook';
import ResultsPanel from './ResultsPanel';

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
                    performanceWarning={calculator.performanceWarning}
                    recommendedConfig={calculator.recommendedConfig}
                    recommendedAlternatives={calculator.recommendedAlternatives}
                    isSearchingOptimal={calculator.isSearchingOptimal}
                    recommendedError={calculator.recommendedError}
                    optimalSearchNote={calculator.optimalSearchNote}
                    findOptimalHardwareConfig={calculator.findOptimalHardwareConfig}
                    setOptimizationGoal={calculator.setOptimizationGoal}
                    optimizationGoals={calculator.OPTIMIZATION_GOALS}
                    applyRecommendedConfig={calculator.applyRecommendedConfig}
                  />,
    },
    {
      label: <><ThunderboltOutlined /> Скорость</>,
      key: 'performance',
      children: (
        <PerformancePanel
          formData={calculator.formData}
          results={calculator.results}
          selectedModelPreset={calculator.selectedModelPreset}
          selectedGpuPreset={calculator.selectedGpuPreset}
          performanceWarning={calculator.performanceWarning}
        />
      ),
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
    <ConfigProvider theme={interferaTheme}>
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Header
        style={{
          background: '#0f172a',
          padding: '14px 24px',
          height: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          borderTop: 0,
          borderLeft: 0,
          borderRight: 0,
          borderBottom: '3px solid transparent',
          borderImage: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%) 1',
          boxShadow: '0 4px 20px -8px rgba(15, 23, 42, 0.35)',
        }}
      >
        {/* Логотип Interfera — bold crimson wordmark (брендбук: «only on light») → белый чип.
            Wordmark отрисован в брендовом шрифте Outfit/800. Чтобы заменить на точный PNG-логотип:
            положи assets/interfera-logo.png в public/ и верни <img src="/interfera-logo.png" />. */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          padding: '7px 16px',
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.22)',
        }}>
          <span style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontWeight: 800,
            fontSize: 22,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: '#ef4444',
          }}>Интерфера</span>
        </div>
        <div style={{ flexGrow: 1 }}>
          <Title level={3} style={{ color: '#fff', margin: 0, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.01em' }}>Калькулятор ЦОД для GenAI</Title>
          <Paragraph style={{ color: 'rgba(248, 250, 252, 0.72)', marginBottom: 0, fontSize: '14px' }}>
            Расчет ресурсов и стоимости инфраструктуры
          </Paragraph>
        </div>
      </Header>
      <Content style={{ padding: '24px', margin: '16px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)' }}>
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
      <Footer style={{ textAlign: 'center', background: '#f8fafc', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
        GenAI Data Center Calculator ©{new Date().getFullYear()} by Ed Cherednik
      </Footer>
    </Layout>
    </ConfigProvider>
  );
};

export default GenAIDataCenterCalculator;