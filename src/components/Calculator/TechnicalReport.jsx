import React from 'react';
import { Card, Typography, List, Alert, Divider, Tag } from 'antd';
import { WarningOutlined, CheckCircleOutlined, ExperimentOutlined, ToolOutlined, RobotOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * Компонент технического отчета с улучшенным дизайном Ant Design
 */
const TechnicalReport = ({ formData, results, modelSizeError }) => {

  const recommendations = [];
  if (formData.modelParamsBitsPrecision > 8) {
    recommendations.push('Рассмотрите возможность квантования модели до 8-бит, что снизит требования к памяти на ~50% с минимальной потерей качества.');
  }
  if (results.requiredGpu > 16) {
    recommendations.push(`При такой высокой нагрузке (${results.requiredGpu} GPU) рассмотрите использование высокоскоростной сети (InfiniBand HDR/NDR) для межузлового взаимодействия.`);
  }
  if (results.energyCostAnnual > 10000) {
    recommendations.push(`Значительные расходы на электроэнергию ($${(results.energyCostAnnual ?? 0).toLocaleString()}/год). Рассмотрите оптимизацию PUE или места размещения с более низкими тарифами.`);
  }
  if (formData.dcCostsPue > 1.4) {
    recommendations.push(`Высокий PUE (${formData.dcCostsPue}). Рассмотрите более эффективные системы охлаждения.`);
  }
  recommendations.push('Используйте технологии батчинга (vLLM, TGI) для увеличения пропускной способности до 2-5 раз без увеличения числа GPU.');
  if ((results.storageRequirementsGB / 1000) > 10) {
    recommendations.push(`Большой объем хранилища (${((results.storageRequirementsGB ?? 0) / 1000).toFixed(1)} ТБ). Рассмотрите использование распределенной файловой системы и кэширования для более эффективного использования ресурсов.`);
  }
  if (results.ramRequirementPerServerGB > 512) {
    recommendations.push(`Высокие требования к RAM (${Math.ceil(results.ramRequirementPerServerGB ?? 0)} ГБ на сервер). Рассмотрите возможность оптимизации использования оперативной памяти и распределения нагрузки между серверами.`);
  }

  return (
    <Card 
      variant="borderless"
      style={{ boxShadow: 'none' }}
      title={<Title level={4} style={{ margin: 0 }}><ToolOutlined style={{ marginRight: 8 }} /> Технический отчет</Title>}
    >
      <Paragraph style={{ color: '#595959' }}>
        Детальный анализ требований к инфраструктуре и рекомендации по оптимизации на основе введенных параметров.
        {formData.isAgentModeEnabled && <Tag icon={<RobotOutlined />} color="processing" style={{ marginLeft: 8 }}>Мультиагентный режим ({formData.agentRequestPercentage}%)</Tag>}
      </Paragraph>
      <Divider />
      
      <Paragraph>
        Для обслуживания <Text strong>{formData.userLoadConcurrentUsers ?? 0}</Text> одновременных пользователей 
        с моделью <Text strong>{formData.modelParamsNumBillion ?? '?'}B</Text> параметров 
        в <Text strong>{formData.modelParamsBitsPrecision ?? '?'}-битной</Text> точности 
        требуется <Text strong>{results.requiredGpu ?? 0}</Text> GPU типа <Text strong>{formData.gpuConfigModel || 'N/A'}</Text>.
      </Paragraph>
      <Paragraph>
        Эти GPU будут размещены в <Text strong>{results.serversRequired ?? 0}</Text> серверах с <Text strong>{formData.serverConfigNumGpuPerServer ?? 0}</Text> GPU в каждом.
        Общее энергопотребление инфраструктуры составит <Text strong>{(results.powerConsumptionKw ?? 0).toFixed(1)} кВт</Text>,
        что с учетом PUE <Text strong>{formData.dcCostsPue ?? 0}</Text> приведет к годовому расходу электроэнергии <Text strong>{(results.annualEnergyKwh ?? 0).toLocaleString()} кВт*ч</Text>.
      </Paragraph>
      
      <Paragraph>
        Первоначальные инвестиции (CapEx) составляют <Text strong>${(results.capexUsd ?? 0).toLocaleString()}</Text>, 
        а ежегодные операционные расходы (OpEx) — <Text strong>${(results.annualOpexUsd ?? 0).toLocaleString()}</Text>.
        Общая стоимость владения (TCO) за 5 лет: <Text strong>${(results.fiveYearTco ?? 0).toLocaleString()}</Text>.
      </Paragraph>
      
      {formData.isAgentModeEnabled && (
        <Paragraph>
           Расчеты OpEx и TCO учитывают <Text strong>{formData.agentRequestPercentage}%</Text> запросов, обрабатываемых мультиагентными системами.
           Параметры одного агентского workflow: 
           <Text strong>{formData.avgAgentsPerTask ?? 0}</Text> агентов, 
           <Text strong>{formData.avgLlmCallsPerAgent ?? 0}</Text> вызовов LLM/агент, 
           <Text strong>{formData.avgToolCallsPerAgent ?? 0}</Text> вызовов Tool/агент. 
           При этом годовая стоимость внешних вызовов инструментов оценивается в <Text strong>${(results.annualExternalToolCost ?? 0).toLocaleString()}</Text>.
        </Paragraph>
      )}
      
      <Paragraph>
        Для хранения модели, датасетов и сопутствующего ПО потребуется примерно <Text strong>{((results.storageRequirementsGB ?? 0) / 1000).toFixed(1)} ТБ</Text> высокопроизводительного SSD/NVMe хранилища.
        Для оптимальной производительности каждый сервер должен быть оснащен <Text strong>{Math.ceil(results.ramRequirementPerServerGB ?? 0)} ГБ</Text> оперативной памяти.
      </Paragraph>
      
      <Paragraph>
        Сетевая инфраструктура: для обеспечения высокой пропускной способности между узлами рекомендуется использование <Text strong>{results.networkType || 'N/A'}</Text>.
        {(results.requiredGpu ?? 0) > 16 && " Учитывая высокое количество GPU, необходимо применение высокопроизводительных межузловых соединений для эффективной работы распределенной системы."}
      </Paragraph>
      
      {formData.batchingOptimizationFactor > 1 && (
        <Alert 
          message={`Учтена оптимизация батчинга (${formData.batchingOptimizationFactor}x)`}
          description="Это повышает эффективность использования GPU. Рекомендуется использовать специализированные серверы инференса (vLLM, TGI, LMDeploy)."
          type="info"
          showIcon
          icon={<ExperimentOutlined />}
          style={{ margin: '16px 0' }}
        />
      )}
      
      {modelSizeError && (
        <Alert
          message="Предупреждение о размере модели"
          description={<>
            <Paragraph style={{ marginBottom: 8 }}>{modelSizeError}</Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
              <Text strong>Рекомендации:</Text> использовать квантование ({formData.modelParamsBitsPrecision} → 8/4-бит) или распределить модель на несколько GPU.
            </Paragraph>
          </>}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ margin: '16px 0' }}
          closable
        />
      )}
      
      <Divider />
      <Title level={5} style={{ marginTop: 16, marginBottom: 12 }}>Рекомендации по оптимизации:</Title>
      <List
        size="small"
        dataSource={recommendations}
        renderItem={item => (
          <List.Item style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 0' }}>
            <List.Item.Meta
              avatar={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16, marginTop: 4 }} />}
              title={<Text style={{ color: '#595959' }}>{item}</Text>}
            />
          </List.Item>
        )}
        style={{ paddingLeft: 8 }}
      />
    </Card>
  );
};

export default TechnicalReport;