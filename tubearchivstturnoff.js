import axios from "axios";

export async function turnTheDeviceOFF() {
  try {
   const result =  await axios.post(process.env.WEBHOOK_TUBEARCHIVISTOff, {
      action: "turn_off"
    });
    console.log(result)
  } catch (error) {
    console.log(error)
  }
}