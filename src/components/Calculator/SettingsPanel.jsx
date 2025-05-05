import React from 'react';
import { Card, Tabs, Form, Input, Select, Row, Col, Typography, Alert, Tooltip, Space, Statistic } from 'antd';
import { 
  InfoCircleOutlined, 
  DatabaseOutlined, // Модель
  SettingOutlined, // Параметры
  DashboardOutlined, // Производительность
  UsergroupAddOutlined, // Нагрузка
  LaptopOutlined, // Оборудование
  DollarCircleOutlined, // Стоимость
  ThunderboltOutlined, // Энергопотребление
  HddOutlined, // VRAM
  StarFilled // Импортируем иконку звезды
} from '@ant-design/icons';
import { MODEL_PRESETS } from '../../data/modelPresets';
import { GPU_PRESETS } from '../../data/gpuPresets';
import { SERVER_PRESETS } from '../../data/serverPresets';

const { Option } = Select;
const { Text, Paragraph } = Typography;

// Функция для преобразования пресетов в формат options для Select
const createOptions = (presets) => {
  return Object.entries(presets).map(([key, { name, recommended }]) => ({ 
    value: key, 
    label: name, 
    recommended: !!recommended // Добавляем флаг
  }));
};

const KpiCard = ({ title, tooltip, value, prefix, suffix, precision = 0, color, icon }) => (
    <Card 
        hoverable 
        size="small" 
        styles={{ body: { padding: '12px 16px' } }}
    >
        <Statistic
            title={<Tooltip title={tooltip}><Space size="small">{icon}{title}</Space></Tooltip>}
            value={value}
            precision={precision}
            prefix={prefix}
            suffix={suffix}
            valueStyle={{ color: color || '#1890ff', fontSize: 18, fontWeight: 500 }}
        />
    </Card>
);

/**
 * Компонент панели настроек с улучшенным дизайном Ant Design
 */
const SettingsPanel = ({ 
  formData, 
  handleFormChange,
  selectedModelPreset, 
  selectedGpuPreset, 
  selectedServerPreset,
  applyModelPreset,
  applyGpuPreset,
  applyServerPreset,
  setBatchingOptimizationFactor,
  activeTab, 
  setActiveTab,
  showModelInfo,
  setShowModelInfo
}) => {

  const modelOptions = createOptions(MODEL_PRESETS);
  const gpuOptions = createOptions(GPU_PRESETS);
  const serverOptions = createOptions(SERVER_PRESETS);

  // Обработчик для Select компонентов Ant Design
  const handleSelectChange = (name, value) => {
    const fakeEvent = { target: { name, value } };
    handleFormChange(fakeEvent);
  };

  const handlePresetSelectChange = (applyFunc, value) => {
    applyFunc(value);
    if (applyFunc === applyModelPreset) {
        setShowModelInfo(!!value);
    }
  };

  const cardHeadStyle = { backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' };

  // Функция для рендеринга опции с иконкой
  const renderOption = (option) => (
    <Space size="small">
      {option.data.label}
      {option.data.recommended && <StarFilled style={{ color: '#faad14' }} />} 
    </Space>
  );

  // Содержимое для вкладок
  const overviewContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
      <Card title={<><DatabaseOutlined style={{ marginRight: 8 }} /> Модель LLM</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
        <Form layout="vertical">
          <Form.Item label="Пресет модели">
            <Select
              showSearch
              placeholder="Выберите модель..."
              value={selectedModelPreset || undefined} 
              onChange={(value) => handlePresetSelectChange(applyModelPreset, value)}
              options={modelOptions}
              optionRender={renderOption}
              filterOption={(input, option) => 
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {showModelInfo && selectedModelPreset && MODEL_PRESETS[selectedModelPreset]?.description && (
            <Alert
              message="Информация о модели"
              description={MODEL_PRESETS[selectedModelPreset]?.description}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Параметры (млрд)" >
                <Input 
                  type="number"
                  name="modelParamsNumBillion"
                  value={formData.modelParamsNumBillion}
                  onChange={handleFormChange}
                  prefix={<SettingOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Точность весов (бит)">
                <Select
                  name="modelParamsBitsPrecision"
                  value={String(formData.modelParamsBitsPrecision)} 
                  onChange={(value) => handleSelectChange('modelParamsBitsPrecision', value)}
                >
                  <Option value="16">16-bit (FP16/BF16)</Option>
                  <Option value="8">8-bit (INT8)</Option>
                  <Option value="4">4-bit (INT4)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item 
            label="Производительность (токенов/с на GPU)"
            tooltip={{ title: 'Сколько токенов в секунду генерирует один GPU для этой модели', icon: <InfoCircleOutlined /> }}
          >
            <Input 
              type="number"
              name="modelParamsTokensPerSecPerGpu"
              value={formData.modelParamsTokensPerSecPerGpu}
              onChange={handleFormChange}
              prefix={<DashboardOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
            />
          </Form.Item>
          
          <Form.Item label="Коэффициент оптимизации батчинга">
            <Select
              value={String(formData.batchingOptimizationFactor)} 
              onChange={setBatchingOptimizationFactor} 
            >
              <Option value="1">Без оптимизации (1x)</Option>
              <Option value="2">Средняя оптимизация (2x)</Option>
              <Option value="3">Высокая оптимизация (3x)</Option>
              <Option value="5">Экстремальная оптимизация (5x)</Option>
            </Select>
            <Paragraph type="secondary" style={{ marginTop: '5px', fontSize: '12px' }}>
              Учитывает возможное повышение эффективности при использовании vLLM, TGI и других оптимизаций
            </Paragraph>
          </Form.Item>
        </Form>
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title={<><UsergroupAddOutlined style={{ marginRight: 8 }} /> Нагрузка</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
            <Form layout="vertical">
              <Form.Item label="Одновременных пользователей">
                <Input 
                  type="number"
                  name="userLoadConcurrentUsers"
                  value={formData.userLoadConcurrentUsers}
                  onChange={handleFormChange}
                />
              </Form.Item>
              <Form.Item label="Токенов в запросе">
                <Input 
                  type="number"
                  name="userLoadTokensPerRequest"
                  value={formData.userLoadTokensPerRequest}
                  onChange={handleFormChange}
                />
              </Form.Item>
              <Form.Item label="Желаемое время ответа (сек)">
                <Input 
                  type="number"
                  name="userLoadResponseTimeSec"
                  value={formData.userLoadResponseTimeSec}
                  onChange={handleFormChange}
                  step="0.1"
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<><LaptopOutlined style={{ marginRight: 8 }} /> Оборудование</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
            <Form layout="vertical">
              <Form.Item label="Тип GPU">
                <Select
                  showSearch
                  placeholder="Выберите GPU..."
                  value={selectedGpuPreset || undefined}
                  onChange={(value) => handlePresetSelectChange(applyGpuPreset, value)}
                  options={gpuOptions}
                  optionRender={renderOption}
                  filterOption={(input, option) => 
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
              {selectedGpuPreset && GPU_PRESETS[selectedGpuPreset]?.description && (
                <Alert
                  message="Информация о GPU"
                  description={GPU_PRESETS[selectedGpuPreset]?.description}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              <Form.Item label="Тип сервера">
                <Select
                  showSearch
                  placeholder="Выберите сервер..."
                  value={selectedServerPreset || undefined}
                  onChange={(value) => handlePresetSelectChange(applyServerPreset, value)}
                  options={serverOptions}
                  optionRender={renderOption}
                  filterOption={(input, option) => 
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
              {selectedServerPreset && SERVER_PRESETS[selectedServerPreset]?.description && (
                <Alert
                  message="Информация о сервере"
                  description={SERVER_PRESETS[selectedServerPreset]?.description}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  );

  const advancedContent = (
     <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title={<><LaptopOutlined style={{ marginRight: 8 }} /> Детали GPU</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
             <Form layout="vertical">
              <Form.Item label="Стоимость GPU (USD)">
                 <Input 
                   type="number"
                   name="gpuConfigCostUsd"
                   value={formData.gpuConfigCostUsd}
                   onChange={handleFormChange}
                   prefix={<DollarCircleOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                 />
               </Form.Item>
               <Form.Item label="Энергопотребление GPU (кВт)">
                 <Input 
                   type="number"
                   name="gpuConfigPowerKw"
                   value={formData.gpuConfigPowerKw}
                   onChange={handleFormChange}
                   step="0.1"
                   prefix={<ThunderboltOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                 />
               </Form.Item>
               <Form.Item label="Объем VRAM (ГБ)">
                 <Input 
                   type="number"
                   name="gpuConfigVramGb"
                   value={formData.gpuConfigVramGb}
                   onChange={handleFormChange}
                    prefix={<HddOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                 />
               </Form.Item>
             </Form>
          </Card>
        </Col>
        <Col xs={24} md={12}>
           <Card title={<><SettingOutlined style={{ marginRight: 8 }} /> Детали сервера</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
            <Form layout="vertical">
                <Form.Item label="GPU на сервер">
                 <Input 
                   type="number"
                   name="serverConfigNumGpuPerServer"
                   value={formData.serverConfigNumGpuPerServer}
                   onChange={handleFormChange}
                 />
               </Form.Item>
               <Form.Item label="Стоимость сервера без GPU (USD)">
                 <Input 
                   type="number"
                   name="serverConfigCostUsd"
                   value={formData.serverConfigCostUsd}
                   onChange={handleFormChange}
                   prefix={<DollarCircleOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                 />
               </Form.Item>
               <Form.Item 
                 label="Доп. энергопотребление (кВт)"
                 tooltip={{ title: 'Энергопотребление CPU, RAM, SSD и др.', icon: <InfoCircleOutlined /> }}
               >
                 <Input 
                   type="number"
                   name="serverConfigPowerOverheadKw"
                   value={formData.serverConfigPowerOverheadKw}
                   onChange={handleFormChange}
                   step="0.1"
                   prefix={<ThunderboltOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                 />
               </Form.Item>
             </Form>
           </Card>
        </Col>
      </Row>
      <Card title={<><DollarCircleOutlined style={{ marginRight: 8 }} /> Затраты ЦОД</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
        <Form layout="vertical">
             <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item label="Электроэнергия (USD/кВт*ч)">
                  <Input 
                    type="number"
                    name="dcCostsElectricityCostUsdPerKwh"
                    value={formData.dcCostsElectricityCostUsdPerKwh}
                    onChange={handleFormChange}
                    step="0.01"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item 
                  label="PUE"
                  tooltip={{ title: 'Коэффициент эффективности ЦОД (обычно 1.2-1.5)', icon: <InfoCircleOutlined /> }}
                >
                  <Input 
                    type="number"
                    name="dcCostsPue"
                    value={formData.dcCostsPue}
                    onChange={handleFormChange}
                    step="0.1"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item 
                  label="Обслуживание (%)"
                  tooltip={{ title: 'Ежегодно от общей стоимости оборудования', icon: <InfoCircleOutlined /> }}
                >
                  <Input 
                    type="number"
                    name="dcCostsAnnualMaintenanceRate"
                    value={formData.dcCostsAnnualMaintenanceRate}
                    onChange={handleFormChange}
                    step="0.01"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
      </Card>
    </Space>
  );

  // Формируем items для Tabs
  const tabItems = [
    {
      label: "Ключевые параметры",
      key: "overview",
      children: overviewContent,
    },
    {
      label: "Расширенные настройки",
      key: "advanced",
      children: advancedContent,
    },
  ];

  return (
    <Card variant="borderless" styles={{ body: { padding: 0 } }}> 
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        type="line" 
        size="large"
        style={{ marginBottom: 0 }}
        items={tabItems} // Используем items
      >
        {/* TabPane больше не нужны */}
      </Tabs>
    </Card>
  );
};

export default SettingsPanel;