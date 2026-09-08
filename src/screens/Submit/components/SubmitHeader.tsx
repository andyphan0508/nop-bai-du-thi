import React from "react";
import logoBtnSg from "../../../assets/logobtnsg.jpg";

type SubmitHeaderProps = {
  subtitle: string;
  title?: string;
  nav?: React.ReactNode;
};

const SubmitHeader = ({ subtitle, title, nav }: SubmitHeaderProps) => {
  const styles = createStyles();

  return (
    <div className="head">
      <img
        className="logo"
        src={logoBtnSg}
        alt="Logo Ban Thanh Niên HTTL Sài Gòn"
        style={styles.logo}
      />
      <div className="kick">Ban Thanh Niên · HTTL Chi Hội Sài Gòn</div>
      <h1>{title || "Nộp bài dự thi Thiết kế bìa"}</h1>
      <p>{subtitle}</p>
      <div className="rule" />
      {nav && <div className="head-nav">{nav}</div>}
    </div>
  );
};

export default SubmitHeader;

const createStyles = () => {
  return {
    logo: { padding: 6 } as React.CSSProperties,
  };
};
