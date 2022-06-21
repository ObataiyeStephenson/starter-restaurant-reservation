import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { createReservation } from "../utils/api";
import ReservationForm from "./ReservationForm";

function CreateReservation() {
  const INITIAL_FORM_STATE = {
    first_name: "",
    last_name: "",
    mobile_number: "",
    reservation_date: "",
    reservation_time: "",
    people: "",
  };

  const [formData, setFormData] = useState({ ...INITIAL_FORM_STATE });
  const [errors, setErrors] = useState([]);
  const history = useHistory();

  const handleChange = (event) => {
    const { target } = event;
    setFormData({
      ...formData,
      [target.name]: target.value,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    createRes();
  };

  function createRes() {
    const ac = new AbortController();
    console.log(formData);
    let { people } = formData;
    people = Number(people);
    createReservation({ ...formData, people }, ac.signal)
      .then(() => {
        //setFormData({ ...INITIAL_FORM_STATE });
        history.push(`/dashboard?date=${formData.reservation_date}`);
      })
      .catch((error) => {
        const splitError = error.message.split("|");
        setErrors(splitError);
      });

    return () => ac.abort();
  }

  const cancelHandler = () => {
    history.go(-1);
  };

  const errorMessage = (
    <div className="alert alert-danger">
      Please fix the following errors:
      <ul>
        {errors.map((error) => {
          return <li key={error}>{error}</li>;
        })}
      </ul>
    </div>
  );

  return (
    <main>
      <h1>Create Reservation</h1>
      <ReservationForm
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        cancelHandler={cancelHandler}
        errors={errors}
        errorMessage={errorMessage}
        formData={formData}
      />
    </main>
  );
}

export default CreateReservation;
