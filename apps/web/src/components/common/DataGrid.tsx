/**
 * DataGrid Component
 * Enhanced table with search, filtering, pagination, and bulk actions
 */

import { useState, useEffect } from 'react';
import {
    Table,
    Input,
    Button,
    Space,
    Select,
    Tag,
    Tooltip,
    Dropdown,
    type TableProps,
    type TablePaginationConfig,
} from 'antd';
import {
    SearchOutlined,
    FilterOutlined,
    ReloadOutlined,
    ExportOutlined,
    DownloadOutlined,
    DeleteOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType, ColumnType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;

export interface DataGridColumn<T = any> extends ColumnType<T> {
    key: string;
    title: string;
    dataIndex?: string;
    render?: (value: any, record: T, index: number) => React.ReactNode;
    sorter?: boolean | ((a: T, b: T) => number);
    filterable?: boolean;
    filterOptions?: { text: string; value: string }[];
}

export interface DataGridProps<T = any> extends Omit<TableProps<T>, 'columns'> {
    columns: DataGridColumn<T>[];
    data: T[];
    loading?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    filterable?: boolean;
    exportable?: boolean;
    refreshable?: boolean;
    bulkActions?: React.ReactNode;
    onRefresh?: () => void;
    onExport?: () => void;
    rowKey?: string | ((record: T) => string);
}

const DataGrid = <T extends Record<string, any>>({
    columns,
    data,
    loading = false,
    searchable = true,
    searchPlaceholder = 'Search...',
    filterable = true,
    exportable = true,
    refreshable = true,
    bulkActions,
    onRefresh,
    onExport,
    rowKey = 'id',
    ...tableProps
}: DataGridProps<T>) => {
    const [searchText, setSearchText] = useState('');
    const [filteredData, setFilteredData] = useState<T[]>(data);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // Filter data based on search text
    useEffect(() => {
        if (!searchText) {
            setFilteredData(data);
        } else {
            const lowerSearchText = searchText.toLowerCase();
            const filtered = data.filter((item) => {
                return columns.some((column) => {
                    const value = column.dataIndex ? item[column.dataIndex] : null;
                    if (value !== null && value !== undefined) {
                        return String(value).toLowerCase().includes(lowerSearchText);
                    }
                    return false;
                });
            });
            setFilteredData(filtered);
        }
    }, [searchText, data, columns]);

    // Update filtered data when data changes
    useEffect(() => {
        setFilteredData(data);
    }, [data]);

    const handleSearch = (value: string) => {
        setSearchText(value);
    };

    const handleRowSelectionChange = (selectedKeys: React.Key[]) => {
        setSelectedRowKeys(selectedKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: handleRowSelectionChange,
    };

    const hasBulkActions = bulkActions || selectedRowKeys.length > 0;

    return (
        <div>
            {/* Toolbar */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <Space>
                    {searchable && (
                        <Search
                            placeholder={searchPlaceholder}
                            allowClear
                            style={{ width: 300 }}
                            onSearch={handleSearch}
                            onChange={(e) => !e.target.value && setSearchText('')}
                        />
                    )}
                    {filterable && columns.some((col) => col.filterable) && (
                        <Button icon={<FilterOutlined />}>Filters</Button>
                    )}
                </Space>

                <Space>
                    {hasBulkActions && (
                        <Space>
                            <Tag color="blue">{selectedRowKeys.length} selected</Tag>
                            {bulkActions}
                        </Space>
                    )}
                    {refreshable && onRefresh && (
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={onRefresh}
                            loading={loading}
                        >
                            Refresh
                        </Button>
                    )}
                    {exportable && onExport && (
                        <Button icon={<ExportOutlined />} onClick={onExport}>
                            Export
                        </Button>
                    )}
                </Space>
            </div>

            {/* Table */}
            <Table
                rowKey={rowKey}
                columns={columns}
                dataSource={filteredData}
                loading={loading}
                rowSelection={bulkActions ? rowSelection : undefined}
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} items`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    defaultPageSize: 20,
                }}
                scroll={{ x: 'max-content' }}
                {...tableProps}
            />
        </div>
    );
};

export default DataGrid;