import {
  DownOutlined,
  EllipsisOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Form,
  Input,
  InputRef,
  MenuProps,
  Popconfirm,
  Row,
  Space,
  Table,
  TableColumnsType,
  Tooltip,
  message,
} from 'antd';
import type { ColumnType, ColumnsType } from 'antd/es/table';
import { FilterConfirmProps } from 'antd/es/table/interface';
import React, { useEffect, useRef, useState } from 'react';
import Highlighter from 'react-highlight-words';
import ModalFdd from '../../components/ModalFdd';
import ModalObjectDelivery from '../../components/ModalObjectDelivery';
import ModalObjectResource from '../../components/ModalObjectResource';
import {
  apiDestination,
  deleteDeliveryObject,
  getDeliveryObject,
} from '../../hooks/deliveryObject';
import { deleteFdd, getFdd, updateFdd } from '../../hooks/fdd';
import {
  deleteObjectResource,
  getObjectResource,
} from '../../hooks/objectResourceService';

interface DataType {
  key: React.Key;
  id: string;
  source: string;
  year: string;
  agreementNumber: string;
  processNumber: string;
  transferAmount: string;
  counterpartValue: string;
  globalValue: string;
  description: string;
  balance: any;
  totalValueExecuted: any;
  resourceObjects: any;
}
// exapanção de obejto/recurso
interface ExpandedDataTypeObject {
  destinationObjects: any;
  key: React.Key;
  id: string;
  objectsId: string;
  fddId: string;
  amount: string;
  unitaryValue: string;
  totalValue: string;
  status: string;
  progress: string;
  balance: string;
  processNumber: string;
  natureExpense: string;
  estimatedValue: string;
  dateCommitted: string;
  executedValue: string;
  deliveryDate: string;
  settlementDate: string;

  //resouce objects
  objects: any;
  acquisitionMode: string;
}
// exapanção de entregas
interface ExpandedDataTypeDelivery {
  key: React.Key;
  unitId: string;
  amount: string;
  deliveryDate: string;
  settlementDate: string;
  ObjectResourceId: string;
}
// unidades
type UnitsResponse = {
  id: string;
  sigla: string;
  nome: string;
  superior: string;
};

type DataIndex = keyof DataType;

export default function FDD() {
  const [showModal, setShowModal] = useState(false);

  const [modalObjectResource, setModalObjectResourse] = useState(false);
  const [modalDelivery, setModalDelivery] = useState(false);

  const [fdd, setFDD] = useState<DataType[]>([]);
  const [recordFdd, setRecordFdd] = useState<any>({});

  const [objectResource, setObjectResource] = useState<any[]>([]);
  const [recordObjectResource, setRecordObjectResource] = useState<any>({});

  const [delivery, setDelivery] = useState<any[]>([]); // delivery - entrega

  const [recordDelivery, setRecordDelivery] = useState<any>({});
  const [units, setUnits] = useState<UnitsResponse[]>([]); // Adicione este estado
  const [selectedFddId, setSelectedFddId] = useState<any>({});

  //Filtros
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<InputRef>(null);

  const getResourceObjectColumnSearchProps = (
    dataIndex: keyof ExpandedDataTypeObject,
  ): ColumnType<ExpandedDataTypeObject> => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleSearch(selectedKeys as string[], confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() =>
              handleSearch(selectedKeys as string[], confirm, dataIndex)
            }
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              if (clearFilters) {
                clearFilters();
              }
              handleResetFilters();
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) => {
      const recordValue =
        dataIndex === 'objects' ? record.objects?.name : record[dataIndex];

      return recordValue
        ? recordValue
            .toString()
            .toLowerCase()
            .includes((value as string).toLowerCase())
        : false;
    },
    onFilterDropdownOpenChange: visible => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: text =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : (
        text
      ),
  });

  const expandedRowRender = (record: any) => {
    //adicionar uma chave única para cada objetos do recurso usando o índice
    const objectWithKeys = objectResource.map((objectResource, index) => ({
      ...objectResource,
      key: `objectResource_${index}`,
    }));
    // filtra os objetos vinculado com a um fdd
    const filterObjectResource = objectWithKeys.filter(
      object => object.fdd?.id === record.id,
    );
    //busca do nome da unidade por id
    const findUnitNameById = (unitId: any) => {
      const unit = units.find(unit => unit.id === unitId);
      return unit ? unit.nome : 'Unidade Desconhecida';
    };
    // tabela de objetos
    const columns: TableColumnsType<ExpandedDataTypeObject> = [
      {
        title: 'Objeto',
        dataIndex: 'objects',
        key: 'objects',
        width: '12%',
        ...getResourceObjectColumnSearchProps('objects'),
        render: objects => (objects ? objects?.name : ''),
      },
      {
        title: 'Unidades e Qtde prevista',
        dataIndex: 'destinationObjects',
        key: 'destinationObjects',
        width: '18%',
        render: (_, record) => {
          const destination = record.destinationObjects;

          if (destination && destination.length > 0) {
            const unitAndQuantity = destination.map(
              (destinationObjects: any) => {
                const unitId = destinationObjects?.unitId || 'Desconhecido';
                const unitName = findUnitNameById(unitId); // Encontra o nome da unidade
                const expectedQuantity =
                  destinationObjects?.expectedQuantity || '***';
                return `${unitName}, Qtd: ${expectedQuantity}`;
              },
            );

            const initialTooltip = unitAndQuantity.shift(); // Remove e obtenha o primeiro elemento
            const restTooltip = unitAndQuantity.join(', ');

            return (
              <Tooltip title={restTooltip}>
                <span>
                  {initialTooltip}
                  <EllipsisOutlined
                    style={{ fontSize: '20px', verticalAlign: 'middle' }}
                  />
                </span>
              </Tooltip>
            );
          }

          return '*******';
        },
      },

      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        ...getResourceObjectColumnSearchProps('status'),
        width: '6%',
        render: (value: any) => value || '*********',
      },
      {
        title: 'Andamento',
        dataIndex: 'progress',
        key: 'progress',
        width: '5%',
        ...getResourceObjectColumnSearchProps('progress'),
        render: (value: any) => value || '*********',
      },
      {
        title: 'Nº processo',
        dataIndex: 'processNumber',
        key: 'processNumber',
        width: '8%',
        ...getResourceObjectColumnSearchProps('processNumber'),
        render: (value: any) => value || '*********',
      },
      {
        title: 'natureza de despesa',
        dataIndex: 'natureExpense',
        key: 'natureExpense',
        className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
        width: '7%',
        ...getResourceObjectColumnSearchProps('natureExpense'),
        render: (value: any) => value || '*********',
      },
      {
        title: 'Modo de aquisição',
        dataIndex: 'acquisitionMode',
        key: 'acquisitionMode',
        width: '7%',
        ...getResourceObjectColumnSearchProps('acquisitionMode'),
        render: (value: any) => value || '*********',
      },
      {
        title: 'Qtde',
        dataIndex: 'amount',
        key: 'amount',
        width: '3%',
        render: (value: any) => value || '*********',
      },
      {
        title: 'Valor unitário',
        dataIndex: 'unitaryValue',
        key: 'unitaryValue',
        width: '8%',
        render: (value: any) => `R$ ${value}` || '*********',
      },
      {
        title: 'Valor total estimado',
        dataIndex: 'estimatedTotalValue',
        key: 'estimatedTotalValue',
        width: '8%',
        render: (value: any) => `R$ ${value}` || '*********',
      },
      {
        title: 'Valor executado',
        dataIndex: 'executedValue',
        key: 'executedValue',
        width: '8%',
        render: (value: any) => `R$ ${value}` || '*********',
      },

      {
        title: 'Data do empenho',
        dataIndex: 'commitmentDate',
        key: 'commitmentDate',
        width: '6%',
        render: (value: any) => value || '*********',
      },
      {
        title: 'Ação',
        key: 'operation',
        width: '5%',
        render: (record: any) => {
          return (
            <Space size="middle">
              <Dropdown
                menu={{
                  items: [
                    {
                      label: (
                        <Popconfirm
                          title="Tem certeza de que deseja desabilitar este objeto ?"
                          onConfirm={() => ClickDeleteObjResource(record)}
                        >
                          Excluir
                        </Popconfirm>
                      ),
                      key: '1',
                      danger: true,
                    },
                    {
                      label: 'Alterar',
                      key: '2',
                      onClick: () => {
                        setRecordObjectResource(record);
                        setSelectedFddId(record.fdd.id);
                      },
                    },
                    {
                      label: (
                        <Space>
                          <PlusOutlined />
                          Entregas
                        </Space>
                      ),
                      key: '3',
                      onClick: () => {
                        setRecordObjectResource(record);
                      },
                    },
                  ],
                  onClick: handleMenuObjetc,
                }}
              >
                <a onClick={e => e.preventDefault()} className="option">
                  <Space>
                    Mais
                    <DownOutlined />
                  </Space>
                </a>
              </Dropdown>
            </Space>
          );
        },
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={filterObjectResource}
        pagination={false}
        expandable={{
          expandedRowRender: expandedRowRenderDelivery,
        }}
      />
    );
  };

  // TABELA DESTINAÇÕES
  const expandedRowRenderDelivery = (record: any) => {
    //adicionar uma chave única para cada entrega usando o índice
    const deliveryWithKeys = delivery.map((delivery, index) => ({
      ...delivery,
      key: `delivery_${index}`,
    }));
    // filtra as entregas vinculados FDD
    const filteredDelivery = deliveryWithKeys.filter(
      dest => dest.resourceObjects?.id === record.id,
    );
    const columns: TableColumnsType<ExpandedDataTypeDelivery> = [
      {
        title: 'Data da entrega',
        dataIndex: 'deliveryDate',
        key: 'deliveryDate',
        render: (value: any) => value || '*********',
      },
      {
        title: 'Quantidade',
        dataIndex: 'amount',
        key: 'amount',
        render: (value: any) => value || '*********',
      },
      {
        title: 'Unidade',
        dataIndex: 'unitId',
        key: 'unitId',
        width: '46%',

        render: (unitId: string) => {
          const unit = units.find(unit => unit.id === unitId);
          return unit ? unit.nome : unitId;
        },
      },
      {
        title: 'Data da liquidação',
        dataIndex: 'settlementDate',
        key: 'settlementDate',
        render: (value: any) => value || '*********',
      },
      {
        title: 'Ação',
        key: 'operation',
        render: (record: any) => {
          return (
            <Space size="middle">
              <Dropdown
                menu={{
                  items: [
                    {
                      label: (
                        <Popconfirm
                          title="Tem certeza de que desabilitar este unidade ?"
                          onConfirm={() => ClickDeleteDestinaions(record.id)}
                        >
                          Excluir
                        </Popconfirm>
                      ),
                      key: '1',
                      danger: true,
                    },
                    {
                      label: 'Alterar',
                      key: '2',
                      onClick: () => {
                        setRecordDelivery(record);
                      },
                    },
                  ],
                  onClick: handleMenuClickDelivery,
                }}
              >
                <a onClick={e => e.preventDefault()} className="option">
                  <Space>
                    Mais
                    <DownOutlined />
                  </Space>
                </a>
              </Dropdown>
            </Space>
          );
        },
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={filteredDelivery}
        pagination={false}
        rowClassName={() => 'custom-table-destiny'} // Defina o nome da classe para o estilo personalizado
      />
    );
  };

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: any,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSearchedColumn('');
    loadingFDDForm();
  };

  const getColumnSearchProps = (
    dataIndex: DataIndex,
  ): ColumnType<DataType> => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleSearch(selectedKeys as string[], confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() =>
              handleSearch(selectedKeys as string[], confirm, dataIndex)
            }
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              if (clearFilters) {
                clearFilters();
              }
              handleResetFilters();
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>

          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) => {
      const recordValue = record[dataIndex];
      return recordValue
        ? recordValue
            .toString()
            .toLowerCase()
            .includes((value as string).toLowerCase())
        : false;
    },
    onFilterDropdownOpenChange: visible => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: text =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : (
        text
      ),
  });

  // tabela FDD
  const columns: ColumnsType<DataType> = [
    {
      title: 'Fonte',
      dataIndex: 'source',
      key: 'source',
      width: '8%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
    },

    {
      title: 'Nº convênio',
      dataIndex: 'agreementNumber',
      key: 'agreementNumber',
      width: '8%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
      ...getColumnSearchProps('agreementNumber'),
      render: (value: any) => value || '*******',
    },
    {
      title: 'Ano',
      dataIndex: 'year',
      key: 'year',
      width: '5%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
      ...getColumnSearchProps('year'),

      render: (value: any) => value || '*******',
    },

    {
      title: 'Valor do repasse',
      dataIndex: 'transferAmount',
      key: 'transferAmount',
      width: '12%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
      render: (value: any) => `R$ ${value}` || '*******',
    },
    {
      title: 'Valor contrapartida',
      dataIndex: 'counterpartValue',
      key: 'counterpartValue',
      width: '12%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
      render: (value: any) => `R$ ${value}` || '*******',
    },
    {
      title: 'Valor global',
      dataIndex: 'globalValue',
      key: 'globalValue',
      width: '12%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
      render: (value: any) => `R$ ${value}` || '*******',
    },
    {
      title: 'Descrição',
      dataIndex: 'description',
      key: 'description',
      width: '13%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
      render: (value: any) => value || '*******',
    },
    {
      title: 'Valor total executado',
      dataIndex: 'totalValueExecuted',
      key: 'totalValueExecuted',
      width: '10%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
      render: (value: any) => `R$ ${value}` || '****',
    },
    {
      title: 'Saldo',
      dataIndex: 'balance',
      key: 'balance',
      width: '12%',
      className: 'custom-column', // Adicione a classe CSS personalizada à coluna "Nome"
      render: (value: any) => `R$ ${value}` || '****',
    },
    {
      title: 'Ação',
      key: 'operation',
      render: (record: any) => {
        return (
          <Space size="middle">
            <Dropdown
              menu={{
                items: [
                  {
                    label: (
                      <Popconfirm
                        title="Tem certeza de que deseja desabilitar este registro?"
                        onConfirm={() => ClickDeleteFDD(record.id)}
                      >
                        Excluir
                      </Popconfirm>
                    ),
                    key: '1',
                    danger: true,
                  },
                  {
                    label: 'Alterar',
                    key: '2',
                    onClick: () => {
                      setRecordFdd(record);
                    },
                  },
                  {
                    label: (
                      <Space style={{ color: ' rgb(0, 21, 42)' }}>
                        <PlusOutlined style={{ color: 'rgb(0, 21, 42)' }} />
                        Objeto
                      </Space>
                    ),
                    key: '3',
                    onClick: () => {
                      setSelectedFddId(record.id);
                    },
                  },
                ],
                onClick: handleMenuClick,
              }}
            >
              <a onClick={e => e.preventDefault()} className="option">
                <Space>
                  Mais
                  <DownOutlined />
                </Space>
              </a>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const updatedTotalValue = (resourceObjects: any) => {
    let totalValue = 0;

    resourceObjects.forEach((resourceObject: any) => {
      const executedValueString = resourceObject?.executedValue;

      // Remover separadores de milhar e substituir a vírgula por ponto
      const sanitizedValueString = executedValueString
        .replace(/\./g, '')
        .replace(',', '.');

      // Converter a string formatada para número
      const executedValue = parseFloat(sanitizedValueString);

      totalValue += executedValue;
    });

    totalValue = parseFloat(totalValue.toFixed(2));

    // Formatar o valor com separadores de milhar e duas casas decimais
    const formattedTotal = totalValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formattedTotal;
  };
  const updatedBalance = (valorExecutado: any, resourceObjects: any) => {
    // Obtém o valor do repasse do objeto resourceObjects
    const repasse = resourceObjects[0]?.fdd?.transferAmount;
    if (repasse) {
      const repasseString = repasse.replace(/\./g, '').replace(',', '.');
      const valorExecutadoString = valorExecutado
        .replace(/\./g, '')
        .replace(',', '.');

      // Converte os valores para números (usando ponto como separador decimal)
      const valorExecutadoNumerico = parseFloat(valorExecutadoString);
      const repasseNumerico = parseFloat(repasseString);

      // Verifica se os valores são válidos antes de subtrair
      if (!isNaN(valorExecutadoNumerico) && !isNaN(repasseNumerico)) {
        // Subtrai o repasse do valorExecutado
        const resultado = repasseNumerico - valorExecutadoNumerico;

        // Formata o resultado com duas casas decimais usando toLocaleString
        const resultadoFormatado = resultado.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        return resultadoFormatado;
      } else {
        return;
      }
    }
  };

  // Função para atualizar as unidades
  const updateDeliveryUnits = (newUnits: UnitsResponse[]) => {
    setUnits(newUnits);
  };
  //Função para rnderizar os nome das unidades
  const fetchUnits = () => {
    const token = localStorage.getItem('token_sso');
    const urlWithToken = `unidadesPC?token=${token}`;

    apiDestination
      .get(urlWithToken)
      .then(response => {
        const listOfUnits = response.data;
        setUnits(listOfUnits);
      })
      .catch(error => {
        console.error('Erro ao obter unidades:', error);
      });
  };
  useEffect(() => {
    fetchUnits();
  }, []);

  //Parte de alteração do fdd, unidades e objetos
  const handleMenuClick: MenuProps['onClick'] = e => {
    if (e.key === '2') {
      setShowModal(true);
    } else if (e.key === '3') {
      setModalObjectResourse(true);
    }
  };

  const handleMenuObjetc: MenuProps['onClick'] = e => {
    if (e.key === '2') {
      setModalObjectResourse(true);
    } else if (e.key === '3') {
      setModalDelivery(true);
    }
  };

  const handleMenuClickDelivery: MenuProps['onClick'] = e => {
    if (e.key === '2') {
      setModalDelivery(true);
    }
  };

  useEffect(() => {
    setShowModal(false);
  }, []);

  // funções de listagem
  useEffect(() => {
    loadingFDDForm();
    loadingObjectResourceForm();
    loadingDeliveryForm();
  }, []);

  async function loadingFDDForm() {
    const response = await getFdd('fdd');
    if (response !== false) {
      const fddData = response.data;

      const sortedCovenants = fddData.sort((a: any, b: any) => {
        return parseInt(a.position, 10) - parseInt(b.position, 10);
      });

      setFDD(sortedCovenants);
    }
  }

  async function loadingObjectResourceForm() {
    const response = await getObjectResource('resourceobjects');
    if (response !== false) {
      setObjectResource(response.data);
    }
  }
  async function loadingDeliveryForm() {
    const response = await getDeliveryObject('delivery');
    if (response !== false) {
      setDelivery(response.data);
    } else {
      message.error('Ocorreu um erro inesperado ao obter as destinações.');
    }
  }
  //funções de exclusão
  const ClickDeleteFDD = async (record: any) => {
    await deleteFdd(record);
    const newFDD = [...fdd];
    newFDD.splice(record, -1);
    setFDD(newFDD);
    loadingFDDForm();
  };

  const ClickDeleteObjResource = async (record: any) => {
    await deleteObjectResource(record.id);
    const newObjResource = [...objectResource];
    newObjResource.splice(record.id, -1);
    setObjectResource(newObjResource);
    loadingObjectResourceForm();

    updatedBalanceList(record.fdd);
  };

  const ClickDeleteDestinaions = async (record: any) => {
    await deleteDeliveryObject(record);
    const newObjResource = [...delivery];
    newObjResource.splice(record, -1);
    setDelivery(newObjResource);
    loadingDeliveryForm();
  };
  // funções para atualizações
  const updateFddList = (newFDD: any) => {
    setFDD(prevottomToBottom => [...prevottomToBottom, newFDD]);
    loadingFDDForm();
  };
  const updateResourceObjectsList = (newRObjectResource: any) => {
    setObjectResource(prevObjectResource => [
      ...prevObjectResource,
      newRObjectResource,
    ]);
    loadingObjectResourceForm();
    loadingFDDForm();
  };

  const submitUpdate = async (fdd: any) => {
    await updateFdd(fdd, fdd.id);
    updateFddList(fdd);
  };

  const updatedBalanceList = async (values: any) => {
    const res = await getFdd(`fdd/${values.id}`);
    if (res) {
      const fddItem = res.data;

      const valorTotalValue = updatedTotalValue(fddItem.resourceObjects);
      const valorBalance = updatedBalance(
        valorTotalValue,
        fddItem?.resourceObjects,
      );
      fddItem.balance = valorBalance;
      fddItem.totalValueExecuted = valorTotalValue;
      submitUpdate(fddItem);
    }
  };

  const updateDeliveryList = (newDestiny: any) => {
    setDelivery(prevDestiny => [...prevDestiny, newDestiny]);
    loadingDeliveryForm();
  };

  // Fechar modal fdd
  const hideModal = (refresh: boolean) => {
    setShowModal(false);
    setRecordFdd(null);
    if (refresh) setFDD([]);
  };

  // Fechar modal objetos
  const hideModalObjectResourse = (refresh: boolean) => {
    setModalObjectResourse(false);
    setRecordObjectResource(null);
    if (refresh) setObjectResource([]);
  };
  // Fechar modal entregas
  const hideModalObjectdelivery = (refresh: boolean) => {
    setModalDelivery(false);
    setRecordDelivery(null);
    if (refresh) setDelivery([]);
  };

  //adiciona uma chave única para cada fdd usando o índice
  const fddWithKeys = fdd.map((fdd, index) => ({
    ...fdd,
    key: `fdd${index}`,
  }));

  return (
    <>
      <Row style={{ paddingBottom: 'inherit', display: 'flow-root' }}>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            style={{ float: 'right', width: 'auto' }}
            onClick={() => {
              setShowModal(true);
            }}
          >
            <PlusOutlined /> FDD
          </Button>
        </Form.Item>
      </Row>
      <Table
        rowKey="key"
        columns={columns}
        expandable={{
          expandedRowRender,
          defaultExpandedRowKeys: ['0'],
        }}
        dataSource={fddWithKeys}
        rowClassName={() => 'custom-table-row'} // Defina o nome da classe para o estilo personalizado
        className="custom-table" // Adicione a classe CSS personalizada à tabela
      />

      <ModalFdd
        id={recordFdd?.id}
        openModal={showModal}
        closeModal={hideModal}
        updateFddList={updateFddList}
        updateBalanceList={updatedBalanceList}
      />

      <ModalObjectResource
        id={recordObjectResource?.id}
        idFdd={selectedFddId}
        idGoal={''}
        idCovenants={''}
        idStateAmendment={''}
        idStateTreasury={''}
        openModal={modalObjectResource}
        closeModal={hideModalObjectResourse}
        updateResourceObjectsList={updateResourceObjectsList}
        updateBalanceList={updatedBalanceList}
      />

      <ModalObjectDelivery
        id={recordDelivery?.id}
        idResourceObject={recordObjectResource?.id}
        openModal={modalDelivery}
        closeModal={hideModalObjectdelivery}
        updateDeliveryList={updateDeliveryList}
        updateDeliveryUnits={updateDeliveryUnits} // Passe a função como prop
      />
    </>
  );
}
