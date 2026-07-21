import React from 'react';
import logoBtnSg from '../../../assets/logobtnsg.jpg';

type SubmitHeaderProps = {
  subtitle: string;
};

const SubmitHeader = ({ subtitle }: SubmitHeaderProps) => {
  const styles = createStyles();

  return (
    <div className="head">
      <img className="logo" src={logoBtnSg} alt="Logo Ban Thanh Niên HTTL Sài Gòn" style={styles.logo} />
      <div className="kick">Ban Thanh Niên · HTTL Chi Hội Sài Gòn</div>
      <h1>Nộp bài dự thi Thiết kế bìa</h1>
      <p>{subtitle}</p>
      <div className="rule" />
    </div>
  );
};

export default SubmitHeader;

const createStyles = () => {
  return {
    logo: { padding: 6 } as React.CSSProperties,
  };
};
