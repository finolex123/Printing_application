// Login Api
export const LoginApi = async (baseurl, username, password) => {
  try {
    let res = await fetch(`${baseurl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });
    return await res.json();
  } catch (error) {
    return error;
  }
};

// Random Data Api
export const RandomDataApi = async () => {
  try {
    let res = await fetch("https://example.com/api/random-data", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await res.json();
  } catch (error) {
    return error;
  }
};
