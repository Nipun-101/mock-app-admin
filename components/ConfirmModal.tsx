import { Modal } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

interface ConfirmModalProps {
  title?: string;
  content?: string;
  onConfirm: () => void;
}

export const showConfirmModal = ({ 
  title = 'Delete Confirmation', 
  content = 'Are you sure you want to delete this item?',
  onConfirm 
}: ConfirmModalProps) => {
  Modal.confirm({
    title: title,
    icon: <ExclamationCircleFilled />,
    content: content,
    okText: 'Yes',
    okType: 'danger',
    cancelText: 'No',
    onOk() {
      onConfirm();
    },
  });
}; 