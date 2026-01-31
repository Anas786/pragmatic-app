import React, { useState } from 'react';
import Filters from '../../../../components/companydetail/filters';
import Alarmblock from '../../../../components/companydetail/blocks/alarmblock';
import Trendblock from '../../../../components/companydetail/blocks/trendblock';
import Summaryblock from '../../../../components/companydetail/blocks/summaryblock';
import Cardblock from '../../../../components/companydetail/blocks/cardblock';

const Viewsscreen: React.FC = () => {
  const [selectedfilter, setselectedfilter] = useState<string>('Summary');
  const selectFilter = (value: string) => {
    setselectedfilter(value);
  };
  const [inverterfilter, setinverterfilter] = useState<string>('customfilter');
  const selectinverterfilter = (value: string) => {
    setinverterfilter(value);
  };
  return (
    <>
      <Filters selectedfilter={selectedfilter} selectFilter={selectFilter} />
      {(selectedfilter === 'Summary' && <Summaryblock />) ||
        (selectedfilter === 'Cards' && <Cardblock />) ||
        (selectedfilter === 'Alarms' && <Alarmblock />) ||
        (selectedfilter === 'Trends' && (
          <Trendblock
            inverterfilter={inverterfilter}
            selectinverterfilter={selectinverterfilter}
          />
        ))}
    </>
  );
};

export default Viewsscreen;

