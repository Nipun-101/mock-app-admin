'use client';
import { useEffect, useState } from 'react';
import { Form, Input, Button, Select, Card, message } from 'antd';
import { useRouter } from 'next/navigation';

export default function EditQuestionPage({ params }) {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    fetchSubjects();
    fetchTags();
    fetchExams();
  }, []);

  useEffect(() => {
    fetchQuestion();
  }, [subjects ,tags ,exams,params.id]);

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`/api/question/${params.id}`);
      const data = await response.json();
      
      form.setFieldsValue({
        questionText: {
          en: { text: data.questionText.en.text },
          ml: { text: data.questionText.ml.text || '' }
        },
        subject: data.subject._id,
        tags: data.tags?.map(tag => tag._id),
        exams: data.exams?.map(exam => exam._id),
        options: data.options,
        correctOption: data.correctOption,
        explanation: {
          en: { text: data.explanation?.en?.text || '' },
          ml: { text: data.explanation?.ml?.text || '' }
        }
      });
    } catch (error) {
      console.error('Failed to fetch question:', error);
      message.error('Failed to fetch question details');
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subject/list');
      const data = await response.json();
      setSubjects(data.subjects.map(subject => ({
        value: subject._id,
        label: subject.name
      })));
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tag/list');
      const data = await response.json();
      setTags(data.tags.map(tag => ({
        value: tag._id,
        label: tag.name
      })));
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await fetch('/api/exam/list');
      const data = await response.json();
      setExams(data.exams.map(exam => ({
        value: exam._id,
        label: exam.name
      })));
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/question/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) throw new Error('Failed to update question');
      
      message.success('Question updated successfully');
      router.push('/admin/questions');
    } catch (error) {
      console.error('Failed to update question:', error);
      message.error('Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Card title="Edit Question">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Question (English)"
            name={['questionText', 'en', 'text']}

          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            label="Question (Malayalam)"
            name={['questionText', 'ml', 'text']}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            label="Subject"
            name="subject"
            rules={[{ required: true, message: 'Please select a subject' }]}
          >
            <Select options={subjects} />
          </Form.Item>

          <Form.Item
            label="Tags"
            name="tags"
          >
            <Select mode="multiple" options={tags} />
          </Form.Item>

          <Form.Item
            label="Exams"
            name="exams"
          >
            <Select mode="multiple" options={exams} />
          </Form.Item>


          <Form.Item
            label="Correct Option"
            name="correctOption"
            rules={[{ required: true, message: 'Please select the correct option' }]}
          >
            <Select>
              {form.getFieldValue('options')?.map((_, index) => (
                <Select.Option key={index} value={index}>
                  Option {index + 1}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Explanation (English)"
            name={['explanation', 'en', 'text']}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            label="Explanation (Malayalam)"
            name={['explanation', 'ml', 'text']}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Question
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
