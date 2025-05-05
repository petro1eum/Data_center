import React from 'react';
import { Card, Tabs, Form, Input, InputNumber, Select, Row, Col, Typography, Alert, Tooltip, Space, Switch, Divider } from 'antd';
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
  StarFilled, // Импортируем иконку звезды
  SlidersOutlined, // Иконка для настроек агентов
  RobotOutlined, // Иконка для агентов
  RetweetOutlined, // Иконка для LLM вызовов
  ToolOutlined, // Иконка для Tool вызовов
  CloudOutlined, // Сеть
  CodeOutlined, // RAM (чип)
  AppstoreAddOutlined // ПО
} from '@ant-design/icons';
import { MODEL_PRESETS } from '../../data/modelPresets';
import { GPU_PRESETS } from '../../data/gpuPresets';
import { SERVER_PRESETS } from '../../data/serverPresets';
import { NETWORK_PRESETS } from '../../data/networkPresets';
import { STORAGE_PRESETS } from '../../data/storagePresets';
import { RAM_PRESETS } from '../../data/ramPresets';
import { SOFTWARE_PRESETS } from '../../data/softwarePresets';

const { Option } = Select;
const { Text, Paragraph, Title } = Typography;

// Функция для преобразования пресетов в формат options для Select
const createOptions = (presets) => {
  return Object.entries(presets).map(([key, { name, recommended, supports_tool_calls }]) => ({ 
    value: key, 
    label: name, 
    recommended: !!recommended, 
    supports_tool_calls: !!supports_tool_calls
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
  selectedNetworkPreset,
  selectedStoragePreset,
  selectedRamPreset,
  selectedSoftwarePreset,
  applyModelPreset,
  applyGpuPreset,
  applyServerPreset,
  applyNetworkPreset,
  applyStoragePreset,
  applyRamPreset,
  applySoftwarePreset,
  setBatchingOptimizationFactor,
  activeTab, 
  setActiveTab,
  showModelInfo,
  setShowModelInfo
}) => {

  const modelOptions = createOptions(MODEL_PRESETS);
  const gpuOptions = createOptions(GPU_PRESETS);
  const serverOptions = createOptions(SERVER_PRESETS);
  const networkOptions = createOptions(NETWORK_PRESETS);
  const storageOptions = createOptions(STORAGE_PRESETS);
  const ramOptions = createOptions(RAM_PRESETS);
  const softwareOptions = createOptions(SOFTWARE_PRESETS);

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

  const handleAgentModeChange = (checked) => {
    handleFormChange('isAgentModeEnabled', checked);
  };

  const cardHeadStyle = { backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' };

  // Функция для рендеринга опции с иконкой
  const renderOption = (option) => (
    <Space size={4}> 
      <span>{option.data.label}</span>
      {option.data.recommended && <StarFilled style={{ color: '#faad14', fontSize: '12px' }} />} 
      {option.data.supports_tool_calls && <ToolOutlined style={{ color: '#1890ff', fontSize: '12px' }} />}
    </Space>
  );

  // Определяем, поддерживает ли выбранная модель tool calls
  const modelSupportsToolCalls = selectedModelPreset && MODEL_PRESETS[selectedModelPreset]?.supports_tool_calls;
  const isAgentSwitchDisabled = !selectedModelPreset || !modelSupportsToolCalls;
  let agentSwitchTooltip = "";
  if (!selectedModelPreset) {
    agentSwitchTooltip = "Сначала выберите модель LLM";
  } else if (!modelSupportsToolCalls) {
    agentSwitchTooltip = `Выбранная модель (${MODEL_PRESETS[selectedModelPreset]?.name}) не поддерживает или плохо поддерживает вызов инструментов (tool calls). Расчеты в мультиагентном режиме будут неточными.`;
  }

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
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
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
                <InputNumber 
                  style={{ width: '100%'}}
                  min={0}
                  name="modelParamsNumBillion"
                  value={formData.modelParamsNumBillion}
                  onChange={(value) => handleFormChange('modelParamsNumBillion', value)}
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
            <InputNumber 
               style={{ width: '100%'}}
               min={0}
                name="modelParamsTokensPerSecPerGpu"
                value={formData.modelParamsTokensPerSecPerGpu}
              onChange={(value) => handleFormChange('modelParamsTokensPerSecPerGpu', value)}
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
                <InputNumber 
                  style={{ width: '100%'}}
                  min={1}
                name="userLoadConcurrentUsers"
                value={formData.userLoadConcurrentUsers}
                  onChange={(value) => handleFormChange('userLoadConcurrentUsers', value)}
                />
              </Form.Item>
              <Form.Item label="Токенов в запросе">
                <InputNumber 
                   style={{ width: '100%'}}
                   min={1}
                name="userLoadTokensPerRequest"
                value={formData.userLoadTokensPerRequest}
                   onChange={(value) => handleFormChange('userLoadTokensPerRequest', value)}
                />
              </Form.Item>
              <Form.Item label="Желаемое время ответа (сек)">
                <InputNumber 
                   style={{ width: '100%'}}
                   min={0.1}
                   step={0.1}
                name="userLoadResponseTimeSec"
                value={formData.userLoadResponseTimeSec}
                   onChange={(value) => handleFormChange('userLoadResponseTimeSec', value)}
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
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
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
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
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
                 <InputNumber 
                   style={{ width: '100%'}}
                   min={0}
                   formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                   parser={(value) => value?.replace(/\$\s?|(,*)/g, '') ?? ''}
                name="gpuConfigCostUsd"
                value={formData.gpuConfigCostUsd}
                   onChange={(value) => handleFormChange('gpuConfigCostUsd', value)}
                 />
               </Form.Item>
               <Form.Item label="Энергопотребление GPU (кВт)">
                 <InputNumber 
                    style={{ width: '100%'}}
                    min={0}
                    step={0.01}
                name="gpuConfigPowerKw"
                value={formData.gpuConfigPowerKw}
                   onChange={(value) => handleFormChange('gpuConfigPowerKw', value)}
                 />
               </Form.Item>
               <Form.Item label="Объем VRAM (ГБ)">
                 <InputNumber 
                    style={{ width: '100%'}}
                    min={0}
                name="gpuConfigVramGb"
                value={formData.gpuConfigVramGb}
                   onChange={(value) => handleFormChange('gpuConfigVramGb', value)}
                 />
               </Form.Item>
             </Form>
          </Card>
        </Col>
        <Col xs={24} md={12}>
           <Card title={<><SettingOutlined style={{ marginRight: 8 }} /> Детали сервера</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
            <Form layout="vertical">
                <Form.Item label="GPU на сервер">
                 <InputNumber 
                   style={{ width: '100%'}}
                   min={1}
                name="serverConfigNumGpuPerServer"
                value={formData.serverConfigNumGpuPerServer}
                   onChange={(value) => handleFormChange('serverConfigNumGpuPerServer', value)}
                 />
               </Form.Item>
               <Form.Item label="Стоимость сервера без GPU (USD)">
                 <InputNumber 
                    style={{ width: '100%'}}
                    min={0}
                    formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value?.replace(/\$\s?|(,*)/g, '') ?? ''}
                name="serverConfigCostUsd"
                value={formData.serverConfigCostUsd}
                    onChange={(value) => handleFormChange('serverConfigCostUsd', value)}
              />
               </Form.Item>
               <Form.Item 
                label="Доп. энергопотребление (кВт)"
                 tooltip={{ title: 'Энергопотребление CPU, RAM, SSD и др.', icon: <InfoCircleOutlined /> }}
               >
                 <InputNumber 
                    style={{ width: '100%'}}
                    min={0}
                    step={0.1}
                name="serverConfigPowerOverheadKw"
                value={formData.serverConfigPowerOverheadKw}
                    onChange={(value) => handleFormChange('serverConfigPowerOverheadKw', value)}
                 />
               </Form.Item>
             </Form>
           </Card>
        </Col>
      </Row>
      <Card title={<><InfoCircleOutlined style={{ marginRight: 8 }} /> Детализация ЦОД</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
        <Form layout="vertical">
            <Row gutter={16}>
                <Col xs={24} sm={12}>
                   <Form.Item 
                        label="Сетевая инфраструктура"
                        tooltip="Тип и стоимость сетевого оборудования"
                   >
                        <Select
                            showSearch
                            placeholder="Выберите тип сети..."
                            value={selectedNetworkPreset || undefined}
                            onChange={applyNetworkPreset}
                            options={networkOptions}
                            optionRender={renderOption} 
                            filterOption={(input, option) => 
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                    <Form.Item label="Стоимость порта сети (USD)">
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={50}
                            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value?.replace(/\$\s?|(,*)/g, '') ?? ''}
                            name="networkCostPerPort"
                            value={formData.networkCostPerPort}
                            onChange={(value) => handleFormChange('networkCostPerPort', value)}
                        />
                    </Form.Item>
                </Col>
                 <Col xs={24} sm={12}>
                   <Form.Item 
                        label="Тип хранилища"
                        tooltip="Тип и стоимость дисковой подсистемы"
                   >
                        <Select
                            showSearch
                            placeholder="Выберите тип хранилища..."
                            value={selectedStoragePreset || undefined}
                            onChange={applyStoragePreset} 
                            options={storageOptions}
                            optionRender={renderOption} 
                            filterOption={(input, option) => 
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                   </Form.Item>
                   <Form.Item label="Стоимость хранилища ($/ГБ)">
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={0.01}
                            precision={2}
                            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value?.replace(/\$\s?|(,*)/g, '') ?? ''}
                            name="storageCostPerGB"
                            value={formData.storageCostPerGB}
                            onChange={(value) => handleFormChange('storageCostPerGB', value)}
                        />
                   </Form.Item>
                </Col>
             </Row>
             <Row gutter={16}>
                <Col xs={24} sm={12}>
                   <Form.Item 
                        label="Тип RAM"
                        tooltip="Тип и стоимость оперативной памяти"
                   >
                        <Select
                            showSearch
                            placeholder="Выберите тип RAM..."
                            value={selectedRamPreset || undefined}
                            onChange={applyRamPreset} 
                            options={ramOptions}
                            optionRender={renderOption} 
                            filterOption={(input, option) => 
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                   </Form.Item>
                   <Form.Item label="Стоимость RAM ($/ГБ)">
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={1}
                            precision={0}
                            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value?.replace(/\$\s?|(,*)/g, '') ?? ''}
                            name="ramCostPerGB"
                            value={formData.ramCostPerGB}
                            onChange={(value) => handleFormChange('ramCostPerGB', value)}
                        />
                   </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                   <Form.Item 
                        label="Серверное ПО"
                        tooltip="Операционная система, системы управления и другое ПО"
                   >
                        <Select
                            showSearch
                            placeholder="Выберите стек ПО..."
                            value={selectedSoftwarePreset || undefined}
                            onChange={applySoftwarePreset} 
                            options={softwareOptions}
                            optionRender={renderOption} 
                            filterOption={(input, option) => 
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                   </Form.Item>
                   <Form.Item label="Годовая стоимость ПО ($/сервер)">
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={100}
                            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value?.replace(/\$\s?|(,*)/g, '') ?? ''}
                            name="annualSoftwareCostPerServer"
                            value={formData.annualSoftwareCostPerServer}
                            onChange={(value) => handleFormChange('annualSoftwareCostPerServer', value)}
                        />
                   </Form.Item>
                </Col>
             </Row>
          </Form>
      </Card>
      <Card title={<><DollarCircleOutlined style={{ marginRight: 8 }} /> Затраты ЦОД (Базовые)</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
         <Form layout="vertical">
             <Row gutter={16}>
                <Col xs={24} sm={8}>
                    <Form.Item label="Электроэнергия (USD/кВт*ч)">
                    <InputNumber 
                       style={{ width: '100%'}}
                       min={0}
                       step={0.01}
                  name="dcCostsElectricityCostUsdPerKwh"
                  value={formData.dcCostsElectricityCostUsdPerKwh}
                       onChange={(value) => handleFormChange('dcCostsElectricityCostUsdPerKwh', value)}
                     />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                    <Form.Item label="PUE" tooltip={{ title: 'Коэффициент эффективности ЦОД (обычно 1.2-1.5)', icon: <InfoCircleOutlined /> }}>
                    <InputNumber 
                       style={{ width: '100%'}}
                       min={1.0}
                       step={0.05}
                  name="dcCostsPue"
                  value={formData.dcCostsPue}
                       onChange={(value) => handleFormChange('dcCostsPue', value)}
                     />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                    <Form.Item label="Обслуживание (%)" tooltip={{ title: 'Ежегодно от общей стоимости оборудования', icon: <InfoCircleOutlined /> }}>
                    <InputNumber 
                       style={{ width: '100%'}}
                       min={0}
                       max={100}
                       step={0.5}
                       formatter={(value) => `${value}%`}
                       parser={(value) => value?.replace('%', '') ?? ''}
                      name="dcCostsAnnualMaintenanceRate"
                      value={formData.dcCostsAnnualMaintenanceRate * 100}
                       onChange={(value) => handleFormChange('dcCostsAnnualMaintenanceRate', (value || 0) / 100)}
                     />
                    </Form.Item>
                </Col>
             </Row>
          </Form>
      </Card>
    </Space>
  );

  const agentContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
       <Card title={<><SlidersOutlined style={{ marginRight: 8 }} /> Настройки Мультиагентного Режима</>} size="small" hoverable styles={{ header: cardHeadStyle }}>
            <Form layout="vertical">
                <Row gutter={16} align="middle">
                    <Col flex="auto">
                        <Tooltip title={agentSwitchTooltip} placement="right"> 
                            <div style={{ display: 'inline-block', cursor: isAgentSwitchDisabled ? 'not-allowed' : 'pointer' }}>
                                <Form.Item 
                                    label="Включить расчет для мультиагентных систем" 
                                    valuePropName="checked" 
                                    style={{ marginBottom: formData.isAgentModeEnabled ? 16 : 0 }}
                                >
                                    <Switch 
                                        checked={formData.isAgentModeEnabled} 
                                        onChange={handleAgentModeChange}
                                        disabled={isAgentSwitchDisabled}
                                    />
                                </Form.Item>
              </div>
                        </Tooltip>
                    </Col>
                    {formData.isAgentModeEnabled && (
                        <Col flex="200px">
                           <Form.Item 
                                label="% агентских запросов"
                                tooltip="Какой процент запросов пользователей инициирует мультиагентный workflow?"
                           >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    max={100}
                                    step={5}
                                    formatter={(value) => `${value}%`}
                                    parser={(value) => value?.replace('%', '') ?? ''}
                                    name="agentRequestPercentage"
                                    value={formData.agentRequestPercentage}
                                    onChange={(value) => handleFormChange('agentRequestPercentage', value)}
                                />
                           </Form.Item>
                        </Col>
                    )}
                 </Row>
                 {formData.isAgentModeEnabled && (
                     <> 
                         <Divider orientation="left" plain><Text type="secondary">Параметры Агентов (на одну задачу)</Text></Divider>
                         <Row gutter={16}>
                             <Col xs={24} sm={12}>
                                 <Form.Item 
                                     label="Среднее кол-во агентов"
                                     tooltip="Сколько агентов в среднем участвуют в решении одной задачи пользователя">
                                    <InputNumber 
                                        style={{ width: '100%'}}
                                        min={1}
                                        name="avgAgentsPerTask"
                                        value={formData.avgAgentsPerTask}
                                        onChange={(value) => handleFormChange('avgAgentsPerTask', value)}
                                        prefix={<RobotOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                 <Form.Item 
                                     label="Среднее кол-во вызовов LLM / агент"
                                     tooltip="Сколько раз каждый агент в среднем обращается к LLM за задачу">
                                     <InputNumber 
                                         style={{ width: '100%'}}
                                         min={0}
                                         name="avgLlmCallsPerAgent"
                                         value={formData.avgLlmCallsPerAgent}
                                         onChange={(value) => handleFormChange('avgLlmCallsPerAgent', value)}
                                         prefix={<RetweetOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                                     />
                                </Form.Item>
                            </Col>
                         </Row>
                         <Row gutter={16}>
                              <Col xs={24} sm={12}>
                                 <Form.Item 
                                     label="Среднее кол-во вызовов Tool / агент"
                                     tooltip="Сколько раз каждый агент в среднем вызывает внешний инструмент (API и т.д.)">
                                     <InputNumber 
                                         style={{ width: '100%'}}
                                         min={0}
                                         name="avgToolCallsPerAgent"
                                         value={formData.avgToolCallsPerAgent}
                                         onChange={(value) => handleFormChange('avgToolCallsPerAgent', value)}
                                         prefix={<ToolOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                                     />
                                </Form.Item>
                             </Col>
                             <Col xs={24} sm={12}>
                                 <Form.Item 
                                     label="Средняя стоимость вызова Tool (USD)"
                                     tooltip="Примерная стоимость одного вызова внешнего платного инструмента">
                                     <InputNumber 
                                         style={{ width: '100%'}}
                                         min={0}
                                         step={0.001}
                                         precision={3}
                                         formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                         parser={(value) => value?.replace(/\$\s?|(,*)/g, '') ?? ''}
                                         name="avgExternalToolCost"
                                         value={formData.avgExternalToolCost}
                                         onChange={(value) => handleFormChange('avgExternalToolCost', value)}
                                     />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item 
                             label="Среднее кол-во токенов / вызов LLM агентом"
                             tooltip="Примерное кол-во токенов (вход+выход) на один внутренний вызов LLM">
                             <InputNumber 
                                 style={{ width: '100%'}}
                                 min={0}
                                 step={100}
                                 name="avgAgentLlmTokens"
                                 value={formData.avgAgentLlmTokens}
                                 onChange={(value) => handleFormChange('avgAgentLlmTokens', value)}
                                 prefix={<SettingOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                             />
                        </Form.Item>
                     </>
                )}
            </Form>
            <Paragraph type="secondary" style={{ marginTop: 10, fontSize: 12 }}>
           Включение этого режима пересчитает нагрузку на LLM и добавит стоимость вызова внешних инструментов в OpEx, что повлияет на общее количество GPU и TCO.
            {!isAgentSwitchDisabled && !modelSupportsToolCalls && 
                 <Text type="warning" strong> Внимание: Выбранная модель не оптимизирована для вызова инструментов.</Text>}
         </Paragraph>
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
      label: "Мультиагентные системы",
      key: "agents",
      children: agentContent,
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